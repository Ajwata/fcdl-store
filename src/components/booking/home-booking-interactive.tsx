"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { BookingSection } from "@/data/cms-defaults";

type Sector = "№1" | "№2" | "№3" | "№4";

type CartItem = {
  id: number;
  sector: Sector;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
};

type PaymentMethod = "cash" | "iban";

type PricingConfig = {
  eveningStartHour: number;
  sectors: Record<string, { dayPrice: number; eveningPrice: number }>;
  durationDiscountRules: Array<{ minHours: number; maxHours: number | null; discountPercent: number }>;
};

type AvailabilitySlot = {
  id: string;
  date: string;
  sector: Sector;
  startHour: number;
  durationHours: number;
  status: "pending" | "confirmed";
  paymentStatus: "unpaid" | "verification" | "paid" | "refunded";
};

type ReferralManager = {
  id: string;
  name: string;
};

type HomeBookingInteractiveProps = {
  bookingSection: BookingSection;
};

const BOOKING_CART_STORAGE_KEY = "booking_cart_v1";
const BOOKING_REFERRAL_STORAGE_KEY = "booking_referral_manager_v1";

function calcTotalPrice(pricing: PricingConfig, sector: string, startHour: number, durationHours: number): number {
  const entry = pricing.sectors[sector];
  if (!entry) return 0;
  let total = 0;
  for (let h = 0; h < durationHours; h++) {
    const hour = startHour + h;
    total += hour >= pricing.eveningStartHour ? entry.eveningPrice : entry.dayPrice;
  }
  return total;
}

function applyDiscount(amount: number, discountPercent: number): number {
  return Math.round((amount * (100 - discountPercent)) / 100);
}

function getDurationDiscountPercent(pricing: PricingConfig, durationHours: number): number {
  const safeHours = Math.max(1, Math.round(durationHours));

  let best = 0;
  for (const rule of pricing.durationDiscountRules ?? []) {
    const inLowerBound = safeHours >= rule.minHours;
    const inUpperBound = rule.maxHours === null || safeHours <= rule.maxHours;
    if (!inLowerBound || !inUpperBound) continue;
    best = Math.max(best, Math.max(0, Math.min(100, Math.round(rule.discountPercent))));
  }

  return best;
}

function formatSectorDimensions(widthMeters: number, heightMeters: number): string {
  return `Ширина ${widthMeters}м • Довжина ${heightMeters}м`;
}

const durationOptions = Array.from({ length: 13 }, (_, index) => index + 1);

function toHour(slot: string): number {
  return Number(slot.split(":")[0]);
}

function toTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateUk(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function isPastHour(date: string, hour: number, nowMs: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [yearRaw, monthRaw, dayRaw] = date.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

  const now = new Date(nowMs);
  const slotStart = new Date(year, month - 1, day, hour, 0, 0, 0);
  return slotStart.getTime() <= now.getTime();
}

function isPastDate(value: string, nowMs: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return value < toIsoDate(new Date(nowMs));
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function HomeBookingInteractive({ bookingSection }: HomeBookingInteractiveProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [nextCartItemId, setNextCartItemId] = useState(1);
  const [bookingPopupOpen, setBookingPopupOpen] = useState(false);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(() => toIsoDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authResolved, setAuthResolved] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [pricingUnavailable, setPricingUnavailable] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);
  const autoCheckoutTriggeredRef = useRef(false);
  const [clientNowMs, setClientNowMs] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [referralManagers, setReferralManagers] = useState<ReferralManager[]>([]);
  const [selectedReferralManagerId, setSelectedReferralManagerId] = useState<string>("none");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, AvailabilitySlot[]>>({});
  const [paymentInfo, setPaymentInfo] = useState<{
    adminDecisionHours: number;
    paymentWindowRules: Array<{ minDaysBeforeStart: number; maxDaysBeforeStart: number | null; paymentHours: number }>;
  } | null>(null);

  const sectorCards = bookingSection.sectorCards;
  const bookingSteps = bookingSection.steps;

  const getSectorDisplay = (sector: Sector): { label: string; dimensions: string; note: string; imageUrl: string } => {
    const match = sectorCards.find((item) => item.key === sector);
    return {
      label: match?.title ?? `Поле ${sector}`,
      dimensions: formatSectorDimensions(match?.widthMeters ?? 0, match?.heightMeters ?? 0),
      note: match?.note ?? "",
      imageUrl: match?.imageUrl ?? "",
    };
  };

  const totalPrice = useMemo(() => {
    if (!pricing || !selectedSector || !selectedSlot || !selectedDuration) return 0;
    const base = calcTotalPrice(pricing, selectedSector, toHour(selectedSlot), selectedDuration);
    const durationDiscountPercent = getDurationDiscountPercent(pricing, selectedDuration);
    const effectiveDiscountPercent = Math.max(discountPercent, durationDiscountPercent);
    return applyDiscount(base, effectiveDiscountPercent);
  }, [pricing, discountPercent, selectedSector, selectedSlot, selectedDuration]);

  const baseTotalPrice = useMemo(() => {
    if (!pricing || !selectedSector || !selectedSlot || !selectedDuration) return 0;
    return calcTotalPrice(pricing, selectedSector, toHour(selectedSlot), selectedDuration);
  }, [pricing, selectedSector, selectedSlot, selectedDuration]);

  const durationDiscountPercent = useMemo(() => {
    if (!pricing || !selectedDuration) return 0;
    return getDurationDiscountPercent(pricing, selectedDuration);
  }, [pricing, selectedDuration]);

  const effectiveDiscountPercent = useMemo(() => {
    return Math.max(discountPercent, durationDiscountPercent);
  }, [discountPercent, durationDiscountPercent]);

  const appliedDiscountLabel = useMemo(() => {
    if (effectiveDiscountPercent <= 0) return "";
    if (discountPercent > 0 && durationDiscountPercent > 0 && discountPercent === durationDiscountPercent) {
      return `Застосовано знижку ${effectiveDiscountPercent}% (персональна та за тривалість)`;
    }
    if (durationDiscountPercent > discountPercent) {
      return `Застосовано знижку за тривалість ${effectiveDiscountPercent}%`;
    }
    if (discountPercent > 0) {
      return `Застосовано персональну знижку ${effectiveDiscountPercent}%`;
    }
    return `Застосовано знижку ${effectiveDiscountPercent}%`;
  }, [discountPercent, durationDiscountPercent, effectiveDiscountPercent]);

  const discountAmount = useMemo(() => {
    return Math.max(0, baseTotalPrice - totalPrice);
  }, [baseTotalPrice, totalPrice]);

  const popupOpen = bookingPopupOpen;

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/account/session", { cache: "no-store" });
        const result = (await response.json()) as { authenticated?: boolean; discountPercent?: number };
        if (cancelled) return;
        setIsAuthorized(Boolean(result.authenticated));
        setDiscountPercent(Math.max(0, Math.min(100, Math.round(result.discountPercent ?? 0))));
      } catch {
        if (cancelled) return;
        setIsAuthorized(false);
        setDiscountPercent(0);
      } finally {
        if (cancelled) return;
        setAuthResolved(true);
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const res = await fetch("/api/pricing", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as PricingConfig;
          setPricing(data);
          setPricingUnavailable(false);
          return;
        }
        setPricingUnavailable(true);
      } catch {
        setPricingUnavailable(true);
      }
    };
    void loadPricing();
  }, []);

  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const res = await fetch("/api/payment-settings", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as typeof paymentInfo;
          setPaymentInfo(data);
        }
      } catch {
        // keep default
      }
    };
    void loadPaymentSettings();
  }, []);

  useEffect(() => {
    const loadReferralManagers = async () => {
      try {
        const res = await fetch("/api/referral-managers", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { managers?: ReferralManager[] };
        const managers = Array.isArray(data.managers) ? data.managers : [];
        setReferralManagers(managers);
      } catch {
        // Keep empty list when request fails.
      }
    };

    void loadReferralManagers();
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BOOKING_CART_STORAGE_KEY);
      const rawReferralManager = window.localStorage.getItem(BOOKING_REFERRAL_STORAGE_KEY);
      if (rawReferralManager && rawReferralManager.trim()) {
        setSelectedReferralManagerId(rawReferralManager);
      }
      if (!raw) {
        setCartHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as { items?: CartItem[]; nextId?: number };
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      const safeItems = items.filter((item) =>
        item &&
        typeof item.id === "number" &&
        typeof item.sector === "string" &&
        typeof item.date === "string" &&
        typeof item.startTime === "string" &&
        typeof item.endTime === "string" &&
        typeof item.durationHours === "number" &&
        typeof item.totalPrice === "number",
      );

      if (safeItems.length > 0) {
        setCartItems(safeItems);
        setNextCartItemId(
          typeof parsed.nextId === "number" && parsed.nextId > 0
            ? parsed.nextId
            : Math.max(...safeItems.map((item) => item.id), 0) + 1,
        );
      }
    } catch {
      // Ignore corrupted local cart payload.
    } finally {
      setCartHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;

    try {
      if (cartItems.length === 0) {
        window.localStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      } else {
        window.localStorage.setItem(
          BOOKING_CART_STORAGE_KEY,
          JSON.stringify({ items: cartItems, nextId: nextCartItemId }),
        );
      }
      window.localStorage.setItem(BOOKING_REFERRAL_STORAGE_KEY, selectedReferralManagerId);
    } catch {
      // localStorage can be unavailable in private mode.
    }
  }, [cartHydrated, cartItems, nextCartItemId, selectedReferralManagerId]);

  useEffect(() => {
    const dates = Array.from(new Set([calendarDate, selectedDate].filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))));
    if (dates.length === 0) return;

    let cancelled = false;

    const loadAvailability = async () => {
      try {
        const responses = await Promise.all(
          dates.map(async (date) => {
            const response = await fetch(`/api/availability?date=${encodeURIComponent(date)}`, { cache: "no-store" });
            if (!response.ok) {
              return { date, slots: [] as AvailabilitySlot[] };
            }

            const result = (await response.json()) as {
              slots?: Array<{
                id: string;
                date: string;
                sector: Sector;
                startTime: string;
                endTime: string;
                status: "pending" | "confirmed";
                paymentStatus: "unpaid" | "verification" | "paid" | "refunded";
              }>;
            };

            const slots = Array.isArray(result.slots)
              ? result.slots
                  .map((slot) => {
                    const startHour = toHour(slot.startTime);
                    const endHour = toHour(slot.endTime);
                    const durationHours = Math.max(1, endHour - startHour);
                    return {
                      id: slot.id,
                      date: slot.date,
                      sector: slot.sector,
                      startHour,
                      durationHours,
                      status: slot.status,
                      paymentStatus: slot.paymentStatus,
                    } as AvailabilitySlot;
                  })
                  .filter((slot) => Number.isFinite(slot.startHour) && Number.isFinite(slot.durationHours))
              : [];

            return { date, slots };
          }),
        );

        if (cancelled) return;
        setAvailabilityByDate((prev) => {
          const next = { ...prev };
          for (const item of responses) {
            next[item.date] = item.slots;
          }
          return next;
        });
      } catch {
        if (cancelled) return;
      }
    };

    void loadAvailability();

    const intervalId = window.setInterval(() => {
      void loadAvailability();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [calendarDate, selectedDate]);

  const selectedDateSectorSlots = useMemo(() => {
    if (!selectedDate || !selectedSector) return [] as AvailabilitySlot[];
    return (availabilityByDate[selectedDate] ?? []).filter((item) => item.sector === selectedSector);
  }, [availabilityByDate, selectedDate, selectedSector]);

  const selectedPaidSlots = useMemo(
    () => selectedDateSectorSlots.filter((item) => item.paymentStatus === "paid" || item.paymentStatus === "verification" || item.status === "confirmed"),
    [selectedDateSectorSlots],
  );

  const selectedUnpaidSlots = useMemo(
    () => selectedDateSectorSlots.filter((item) => item.paymentStatus === "unpaid" && item.status !== "confirmed"),
    [selectedDateSectorSlots],
  );

  const removeCartItem = (id: number) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };
  const operatingHours = useMemo(() => {
    return { startHour: 6, endHour: 22 };
  }, []);

  const availableStartSlots = useMemo(() => {
    if (!selectedDate || !selectedSector) {
      return [] as Array<{ slot: string; disabled: boolean; claimants: number }>;
    }

    return Array.from({ length: operatingHours.endHour - operatingHours.startHour }, (_, index) => {
      const startHour = operatingHours.startHour + index;
      const blocked = selectedPaidSlots.some((item) =>
        rangesOverlap(startHour, startHour + 1, item.startHour, item.startHour + item.durationHours),
      );
      const past = clientNowMs <= 0 || isPastDate(selectedDate, clientNowMs) || isPastHour(selectedDate, startHour, clientNowMs);

      const claimants = selectedUnpaidSlots.filter((item) =>
        rangesOverlap(startHour, startHour + 1, item.startHour, item.startHour + item.durationHours),
      ).length;

      return {
        slot: toTime(startHour),
        disabled: blocked || past,
        claimants,
      };
    });
  }, [selectedDate, selectedSector, operatingHours, selectedPaidSlots, selectedUnpaidSlots]);

  const availableDurations = useMemo(() => {
    if (!selectedDate || !selectedSector || !selectedSlot) {
      return [] as Array<{ hours: number; disabled: boolean }>;
    }

    const startHour = toHour(selectedSlot);

    return durationOptions.map((hours) => {
      const endHour = startHour + hours;
      const outOfSchedule = endHour > operatingHours.endHour;

      const intersectsBooked = selectedPaidSlots.some((item) =>
        rangesOverlap(startHour, endHour, item.startHour, item.startHour + item.durationHours),
      );

      return {
        hours,
        disabled: outOfSchedule || intersectsBooked,
      };
    });
  }, [selectedDate, selectedSector, selectedSlot, operatingHours, selectedPaidSlots]);

  const popupStep = useMemo(() => {
    if (!selectedSector) {
      return "sector";
    }
    if (!selectedDate) {
      return "date";
    }
    if (!selectedSlot) {
      return "slots";
    }
    if (!selectedDuration) {
      return "duration";
    }
    return "summary";
  }, [selectedSector, selectedDate, selectedSlot, selectedDuration]);

  const closePopup = () => {
    setBookingPopupOpen(false);
    setSelectedSector(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setSelectedDuration(null);
  };

  const startBookingFromPopup = () => {
    setSelectedSector(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setSelectedDuration(null);
    setBookingPopupOpen(true);
  };

  const startBookingFromCalendar = (sector: Sector, date: string, hour?: number) => {
    setSelectedSector(sector);
    setSelectedDate(date);
    setSelectedSlot(typeof hour === "number" ? toTime(hour) : null);
    setSelectedDuration(null);
    setBookingPopupOpen(true);
  };

  const addCurrentSelectionToCart = () => {
    if (!pricing) {
      setSubmitError("Тарифи тимчасово недоступні");
      return;
    }

    if (!selectedSector || !selectedDate || !selectedSlot || !selectedDuration) {
      return;
    }

    const startHour = toHour(selectedSlot);
    const endHour = startHour + selectedDuration;

    setCartItems((prev) => [
      ...prev,
      {
        id: nextCartItemId,
        sector: selectedSector,
        date: selectedDate,
        startTime: selectedSlot,
        endTime: toTime(endHour),
        durationHours: selectedDuration,
        totalPrice,
      },
    ]);
    setNextCartItemId((prev) => prev + 1);
    setCartPopupOpen(true);
    setSubmitError("");
  };

  const submitCart = async (successRedirect = "/account/bookings") => {
    if (cartItems.length === 0) {
      setSubmitError("Кошик порожній");
      return;
    }

    setSubmitBusy(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/account/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            sector: item.sector,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            durationHours: item.durationHours,
            totalPrice: item.totalPrice,
          })),
          paymentMethod: selectedPaymentMethod,
          referredByManagerId: selectedReferralManagerId !== "none" ? selectedReferralManagerId : undefined,
        }),
      });

      const result = (await response.json()) as { error?: string; paymentInfo?: unknown };
      if (!response.ok) {
        setSubmitError(result.error ?? "Не вдалося створити бронювання");
        return;
      }

      // Store payment info from response
      if (result.paymentInfo) {
        setPaymentInfo(result.paymentInfo as typeof paymentInfo);
      }

      setCartItems([]);
      try {
        window.localStorage.removeItem(BOOKING_CART_STORAGE_KEY);
      } catch {
        // ignore
      }
      setCartPopupOpen(false);
      window.location.assign(successRedirect);
    } catch {
      setSubmitError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setSubmitBusy(false);
    }
  };

  useEffect(() => {
    const postLoginAction = searchParams.get("postLogin");
    if (postLoginAction !== "checkout") return;
    if (!authResolved || !cartHydrated || !isAuthorized) return;
    if (autoCheckoutTriggeredRef.current) return;

    if (cartItems.length === 0) {
      router.replace("/account/payments");
      return;
    }

    autoCheckoutTriggeredRef.current = true;
    setCartPopupOpen(false);
    void submitCart("/account/payments");
  }, [authResolved, cartHydrated, isAuthorized, cartItems.length, router, searchParams]);

  useEffect(() => {
    const tick = () => setClientNowMs(Date.now());
    tick();
    const timerId = window.setInterval(tick, 30000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(calendarDate)) return;
    const [yearRaw, monthRaw] = calendarDate.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    setCalendarMonth((prev) => {
      if (prev.getFullYear() === year && prev.getMonth() === month - 1) {
        return prev;
      }
      return new Date(year, month - 1, 1);
    });
  }, [calendarDate]);

  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const paymentWindowRulesForDisplay = useMemo(() => {
    const rules = paymentInfo?.paymentWindowRules ?? [];
    return [...rules].sort((a, b) => a.minDaysBeforeStart - b.minDaysBeforeStart);
  }, [paymentInfo]);
  const adminDecisionHoursForDisplay = paymentInfo?.adminDecisionHours;
  const todayIso = clientNowMs > 0 ? toIsoDate(new Date(clientNowMs)) : "";

  const calendarMonthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("uk-UA", { month: "long", year: "numeric" }).format(calendarMonth);
  }, [calendarMonth]);

  const inlineCalendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{ iso: string; dayNumber: number; inCurrentMonth: boolean }> = [];

    for (let index = 0; index < firstWeekday; index++) {
      const dayNumber = daysInPrevMonth - firstWeekday + index + 1;
      const date = new Date(year, month - 1, dayNumber);
      days.push({ iso: toIsoDate(date), dayNumber, inCurrentMonth: false });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const date = new Date(year, month, dayNumber);
      days.push({ iso: toIsoDate(date), dayNumber, inCurrentMonth: true });
    }

    const trailing = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
    for (let index = 1; index <= trailing; index++) {
      const date = new Date(year, month + 1, index);
      days.push({ iso: toIsoDate(date), dayNumber: index, inCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  const calendarHours = useMemo(() => {
    return Array.from({ length: operatingHours.endHour - operatingHours.startHour }, (_, index) => operatingHours.startHour + index);
  }, [operatingHours]);

  const calendarRows = useMemo(() => {
    const visibleSectors = sectorCards.map((sector) => sector.key);

    return visibleSectors.map((sectorName) => {
      const slots = (availabilityByDate[calendarDate] ?? [])
        .filter((item) => item.sector === sectorName)
        .sort((a, b) => a.startHour - b.startHour);

      return {
        sector: sectorName,
        slots,
        paidCount: slots.filter((slot) => slot.paymentStatus === "paid" || slot.paymentStatus === "verification" || slot.status === "confirmed").length,
        claimCount: slots.filter((slot) => slot.paymentStatus === "unpaid" && slot.status !== "confirmed").length,
      };
    });
  }, [availabilityByDate, calendarDate, sectorCards]);

  return (
    <section id="booking" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
      <div className="mb-8">
        <div className="max-w-3xl">
          <h2 className="font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
            {bookingSection.title}
          </h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            {bookingSection.description}
          </p>
        </div>
      </div>

      {pricingUnavailable && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Тарифи тимчасово недоступні. Спробуйте оновити сторінку пізніше.
        </div>
      )}

      {sectorCards.length === 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Дані про поля тимчасово недоступні.
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {bookingSteps.slice(0, 3).map((step, index) => (
          <div key={`${step.label}-${index}`} className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue-700)]">{step.label}</p>
            <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">{step.title}</p>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-[34px] border border-[var(--border-soft)] bg-[linear-gradient(140deg,rgba(255,255,255,0.98)_0%,rgba(242,248,255,0.95)_58%,rgba(234,245,255,0.96)_100%)] p-5 shadow-[0_24px_90px_rgba(8,26,51,0.1)] backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-[var(--blue-200)]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-40 w-40 rounded-full bg-[var(--green-200)]/55 blur-3xl" />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {sectorCards.map((sectorCard) => {
            const { key, note, widthMeters, heightMeters } = sectorCard;
            const isSelected = selectedSector === key;
            const dimensions = formatSectorDimensions(widthMeters, heightMeters);

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedSector(key);
                  setSelectedDate("");
                  setSelectedSlot(null);
                  setSelectedDuration(null);
                  setBookingPopupOpen(true);
                }}
                className={`group flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-[var(--green-700)] shadow-[0_8px_28px_rgba(16,63,37,0.18)]"
                    : "border-[var(--blue-100)] hover:border-[var(--green-700)] hover:shadow-[0_6px_20px_rgba(16,63,37,0.12)]"
                }`}
              >
                {/* Field visual */}
                <div
                  className="relative aspect-[3/4] overflow-hidden"
                  style={{
                    background:
                      key === "№2"
                        ? "repeating-linear-gradient(to right,#1c7340 0%,#1c7340 12.5%,#186838 12.5%,#186838 25%)"
                        : "repeating-linear-gradient(to bottom,#1c7340 0%,#1c7340 12.5%,#186838 12.5%,#186838 25%)",
                  }}
                >
                  {/* Field outline */}
                  <div className="absolute inset-[10%] border border-white/55" />

                  {key === "№2" ? (
                    /* 40×17m, split vertically — no goals */
                    <>
                      <div className="absolute bottom-[10%] left-1/2 top-[10%] w-px -translate-x-1/2 bg-white/55" />
                      {/* Dimensions */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">17м</div>
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-white/80">40м</div>
                    </>
                  ) : key === "№4" ? (
                    /* 60×40m, full field. card 3:4 → width=40m, height=60m */
                    /* 1m wide = 2% card, 1m tall = 1.33% card */
                    <>
                      {/* Midline */}
                      <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-white/55" />
                      {/* Center circle: dia 18m → w=36% but h=24% to appear circular on 3:4 card */}
                      <div className="absolute left-1/2 top-1/2 h-[24%] w-[32%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/48" />
                      {/* Center spot */}
                      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
                      {/* Penalty areas: 24m wide × 8m deep → w=48%, h=10.7% */}
                      <div className="absolute left-[26%] right-[26%] top-[10%] h-[11%] border border-white/42" />
                      <div className="absolute bottom-[10%] left-[26%] right-[26%] h-[11%] border border-white/42" />
                      {/* Goal areas: 14m wide × 4m deep → w=28%, h=5.3% */}
                      <div className="absolute left-[36%] right-[36%] top-[10%] h-[5%] border border-white/55" />
                      <div className="absolute bottom-[10%] left-[36%] right-[36%] h-[5%] border border-white/55" />
                      {/* Penalty spots: 11m from goal line → 11/60*80%=14.7% from boundary */}
                      <div className="absolute left-1/2 top-[24.7%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/55" />
                      <div className="absolute bottom-[24.7%] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/55" />
                      {/* Dimensions */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">40м</div>
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-white/80">60м</div>
                    </>
                  ) : (
                    /* Поле 1 & 3: 40×20m, goals 3×2 */
                    /* 1m wide = 4% card, 1m tall = 2% card */
                    <>
                      {/* Midline */}
                      <div className="absolute left-[10%] right-[10%] top-1/2 h-px -translate-y-1/2 bg-white/55" />
                      {/* Penalty areas: 12m wide × 6m deep → w=48%, h=12% */}
                      <div className="absolute left-[26%] right-[26%] top-[10%] h-[12%] border border-white/42" />
                      <div className="absolute bottom-[10%] left-[26%] right-[26%] h-[12%] border border-white/42" />
                      {/* Goal areas: 3m wide × 2m deep → w=12%, h=4% */}
                      <div className="absolute left-[44%] right-[44%] top-[10%] h-[4%] border border-white/58" />
                      <div className="absolute bottom-[10%] left-[44%] right-[44%] h-[4%] border border-white/58" />
                      {/* Dimensions */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">20м</div>
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-white/80">40м</div>
                    </>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 flex items-start justify-end p-2">
                      <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[var(--green-700)] shadow-sm">
                        Обрано
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </div>
                {/* Info below visual */}
                <div className={`flex flex-1 flex-col p-4 ${isSelected ? "bg-[#f0faf4]" : "bg-white"}`}>
                  <p className="text-base font-bold text-[var(--blue-950)]">{sectorCard.title}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-[var(--blue-700)]">{dimensions}</p>
                  <p className="mt-1.5 text-sm font-normal leading-snug text-[var(--blue-800)]">{note}</p>
                  <p className="mt-auto pt-3 text-lg font-bold text-[var(--green-700)]">Від {pricing?.sectors[key]?.dayPrice ?? "—"} грн/год</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-[30px] border border-[var(--blue-100)] bg-white/92 p-5 shadow-[0_18px_46px_rgba(8,26,51,0.08)] sm:p-7">
        <div className="grid gap-4 md:grid-cols-2 md:items-start md:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--green-700)]">{bookingSection.calendarBadge}</p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--blue-950)] sm:text-3xl">{bookingSection.calendarTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {bookingSection.calendarDescription}
            </p>
          </div>

          <div className="w-full rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)]/65 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{bookingSection.calendarDateLabel}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-lg border border-[var(--blue-100)] bg-white px-2 py-1 text-sm font-semibold text-[var(--blue-900)]"
                aria-label="Попередній місяць"
              >
                ←
              </button>
              <p className="text-sm font-semibold capitalize text-[var(--blue-950)]">{calendarMonthLabel}</p>
              <button
                type="button"
                onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="rounded-lg border border-[var(--blue-100)] bg-white px-2 py-1 text-sm font-semibold text-[var(--blue-900)]"
                aria-label="Наступний місяць"
              >
                →
              </button>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {[
                "Пн",
                "Вт",
                "Ср",
                "Чт",
                "Пт",
                "Сб",
                "Нд",
              ].map((dayLabel) => (
                <span key={dayLabel}>{dayLabel}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {inlineCalendarDays.map((day) => {
                const isSelected = day.iso === calendarDate;
                const isPastDate = day.iso < todayIso;

                return (
                  <button
                    key={day.iso}
                    type="button"
                    disabled={isPastDate}
                    onClick={() => {
                      setCalendarDate(day.iso);
                      if (!day.inCurrentMonth) {
                        const date = new Date(`${day.iso}T00:00:00`);
                        setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      }
                    }}
                    className={`h-9 rounded-md text-sm font-semibold transition ${
                      isPastDate
                        ? "cursor-not-allowed bg-slate-100 text-slate-300"
                        : isSelected
                          ? "bg-[var(--green-700)] text-white"
                          : day.inCurrentMonth
                            ? "bg-white text-[var(--blue-900)] hover:bg-[var(--green-100)]"
                            : "bg-white/70 text-slate-400 hover:bg-[var(--green-50)]"
                    }`}
                  >
                    {day.dayNumber}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {calendarRows.map((row) => (
            <article key={row.sector} className="rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)]/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--blue-950)]">{getSectorDisplay(row.sector).label}</p>
                  <p className="text-[11px] font-semibold text-[var(--blue-700)]">{getSectorDisplay(row.sector).dimensions}</p>
                </div>
                <div />
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">{bookingSection.legendFreeLabel}</span>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">{bookingSection.legendPendingLabel}</span>
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-white">{bookingSection.legendBookedLabel}</span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-8">
                {calendarHours.map((hour) => {
                  const blocked = row.slots.some((slot) =>
                    (slot.paymentStatus === "paid" || slot.paymentStatus === "verification" || slot.status === "confirmed") &&
                    rangesOverlap(hour, hour + 1, slot.startHour, slot.startHour + slot.durationHours),
                  );
                  const claimants = row.slots.filter((slot) =>
                    slot.paymentStatus !== "paid" &&
                    slot.paymentStatus !== "verification" &&
                    slot.status !== "confirmed" &&
                    rangesOverlap(hour, hour + 1, slot.startHour, slot.startHour + slot.durationHours),
                  ).length;
                  const past = clientNowMs <= 0 || isPastDate(calendarDate, clientNowMs) || isPastHour(calendarDate, hour, clientNowMs);

                  const hourState = past ? "past" : blocked ? "booked" : claimants > 0 ? "waiting" : "free";

                  return (
                    <button
                      type="button"
                      key={`${row.sector}-${hour}`}
                      disabled={blocked || past}
                      onClick={() => startBookingFromCalendar(row.sector, calendarDate, hour)}
                      className={`rounded px-2 py-1 text-center text-[10px] font-semibold ${
                        hourState === "past"
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : hourState === "booked"
                          ? "cursor-not-allowed bg-rose-600 text-white"
                          : hourState === "waiting"
                            ? "bg-amber-200 text-amber-900 transition hover:bg-amber-300"
                            : "bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                      }`}
                      title={
                        hourState === "past"
                          ? "Час уже минув"
                          : hourState === "booked"
                          ? "Заброньовано"
                          : hourState === "waiting"
                            ? `В очікуванні: ${claimants}`
                            : "Вільно"
                      }
                    >
                      {toTime(hour)}{claimants > 0 ? ` • ${claimants}` : ""}
                    </button>
                  );
                })}
              </div>
              {bookingSection.legendHint.trim() ? (
                <p className="mt-2 text-xs text-slate-500">
                  {bookingSection.legendHint}
                </p>
              ) : null}
              {getSectorDisplay(row.sector).imageUrl.trim() ? (
                <img
                  src={getSectorDisplay(row.sector).imageUrl}
                  alt={getSectorDisplay(row.sector).label}
                  className="mt-2 h-44 w-full rounded-lg border border-[var(--blue-100)] object-cover"
                />
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {cartItems.length === 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--blue-100)] bg-white/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(8,26,51,0.12)] backdrop-blur-sm md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Швидке бронювання</p>
              <p className="truncate text-sm font-bold text-[var(--blue-950)]">Сектор, дата і час в одному попапі</p>
            </div>
            <button
              type="button"
              onClick={startBookingFromPopup}
              className="cta-primary shrink-0 rounded-full bg-[var(--green-700)] px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] !text-white transition hover:bg-[var(--green-800)]"
            >
              Відкрити
            </button>
          </div>
        </div>
      )}

      {cartItems.length > 0 && (
        <button
          type="button"
          onClick={() => setCartPopupOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--green-700)] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.12em] !text-white shadow-[0_16px_34px_rgba(8,26,51,0.28)] transition hover:bg-[var(--green-800)] md:bottom-6 md:right-6"
        >
          Кошик
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/18 px-1.5 text-[11px] font-black text-white">
            {cartItems.length}
          </span>
        </button>
      )}

      {popupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,51,0.65)] px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-[28px] bg-white p-5 pb-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Бронювання сектора</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--blue-950)] sm:text-3xl">{selectedSector ? getSectorDisplay(selectedSector).label : "Обери сектор"}</h3>
                {selectedSector && (
                  <p className="mt-1 text-xs font-semibold text-[var(--blue-700)]">{getSectorDisplay(selectedSector).dimensions}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closePopup}
                className="ui-chip-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--blue-100)] bg-white text-[var(--blue-900)]"
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            {popupStep === "sector" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Обери сектор</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sectorCards.map(({ key, title, note, widthMeters, heightMeters }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedSector(key);
                        setSelectedDate("");
                        setSelectedSlot(null);
                        setSelectedDuration(null);
                      }}
                      className={`ui-chip-button rounded-[14px] border px-3 py-3 text-left transition ${
                        selectedSector === key
                          ? "border-[var(--green-700)] bg-[var(--green-100)]/65"
                          : "border-[var(--blue-100)] bg-[var(--blue-50)] hover:border-[var(--green-700)]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--blue-950)]">{title}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[var(--blue-700)]">{formatSectorDimensions(widthMeters, heightMeters)}</p>
                      <p className="mt-0.5 text-xs text-[var(--blue-800)]">{note}</p>
                      <p className="mt-2 text-xs font-bold text-[var(--green-700)]">День: {pricing?.sectors[key]?.dayPrice ?? "—"} / Вечір: {pricing?.sectors[key]?.eveningPrice ?? "—"} грн/год</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "date" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Обери дату</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSelectedSlot(null);
                    setSelectedDuration(null);
                  }}
                  className="mt-3 w-full rounded-[14px] border border-[var(--blue-100)] px-4 py-3 text-[var(--blue-950)]"
                />
              </div>
            )}

            {popupStep === "slots" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Обери час</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableStartSlots.map((slotItem) => (
                    <button
                      key={slotItem.slot}
                      type="button"
                      disabled={slotItem.disabled}
                      onClick={() => {
                        setSelectedSlot(slotItem.slot);
                        setSelectedDuration(null);
                      }}
                      className={`ui-chip-button rounded-[14px] border px-3 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${
                        slotItem.disabled
                          ? "border-slate-200 bg-slate-100 text-slate-400"
                          : slotItem.claimants > 0
                            ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400"
                            : "border-[var(--blue-100)] bg-[var(--blue-50)] text-[var(--blue-900)] hover:border-[var(--green-700)]"
                      }`}
                    >
                      {slotItem.slot}{slotItem.claimants > 0 ? ` (${slotItem.claimants})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "duration" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Обери тривалість</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableDurations.map((item) => (
                    <button
                      key={item.hours}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => setSelectedDuration(item.hours)}
                      className="ui-chip-button rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-3 text-left text-sm font-bold text-[var(--blue-900)] transition hover:border-[var(--green-700)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {`${item.hours} год ${selectedSlot ?? ""} - ${toTime(toHour(selectedSlot ?? "00:00") + item.hours)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "summary" && (
              <div className="mt-7 space-y-4">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Підтвердження</p>
                <div className="rounded-[16px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <p className="text-xs text-[var(--blue-700)]">Сектор: <span className="font-semibold text-[var(--blue-950)]">{selectedSector ? getSectorDisplay(selectedSector).label : ""}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Date: <span className="font-semibold text-[var(--blue-950)]">{formatDateUk(selectedDate)}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Hour: <span className="font-semibold text-[var(--blue-950)]">{selectedSlot}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Duration: <span className="font-semibold text-[var(--blue-950)]">{selectedDuration} год</span></p>
                  <p className="mt-3 border-t border-[var(--blue-100)] pt-3 text-xs text-[var(--blue-700)]">
                    Тариф: День {pricing?.sectors[selectedSector ?? ""]?.dayPrice ?? "—"} грн/год · Вечір {pricing?.sectors[selectedSector ?? ""]?.eveningPrice ?? "—"} грн/год
                  </p>
                  <p className="mt-2 text-xs text-[var(--blue-700)]">Базова ціна: <span className="font-semibold text-[var(--blue-950)]">{baseTotalPrice} грн</span></p>
                  {effectiveDiscountPercent > 0 && (
                    <>
                      <p className="mt-1 text-xs font-semibold text-emerald-800">{appliedDiscountLabel}</p>
                      <p className="mt-1 text-xs text-emerald-700">Економія: {discountAmount} грн</p>
                    </>
                  )}
                  <p className="mt-2 text-lg font-bold text-[var(--green-700)]">Ціна: {totalPrice} грн</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addCurrentSelectionToCart();
                    closePopup();
                  }}
                  className="cta-primary w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
                >
                  Додати в кошик
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cartPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,51,0.65)] px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-[28px] bg-white p-5 pb-7 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Cart</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--blue-950)] sm:text-3xl">Твої бронювання</h3>
              </div>
              <button
                type="button"
                onClick={() => setCartPopupOpen(false)}
                className="ui-chip-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--blue-100)] bg-white text-[var(--blue-900)]"
                aria-label="Закрити кошик"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {cartItems.map((item) => (
                <div key={item.id} className="rounded-[16px] border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-4 text-sm text-slate-600">
                  <p className="font-bold text-[var(--blue-950)]">{getSectorDisplay(item.sector).label}</p>
                  <p className="text-xs font-semibold text-[var(--blue-700)]">{getSectorDisplay(item.sector).dimensions}</p>
                  <p>Дата: {formatDateUk(item.date)}</p>
                  <p>Час: {item.startTime} - {item.endTime}</p>
                  <p>Тривалість: {item.durationHours} год</p>
                  <p className="mt-1 font-semibold text-[var(--green-700)]">{item.totalPrice} грн</p>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.id)}
                      className="rounded-full border border-[var(--blue-200)] px-3 py-1 text-xs font-semibold text-[var(--blue-800)] transition hover:border-red-300 hover:text-red-600"
                    >
                      Видалити
                    </button>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-[var(--blue-100)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">До оплати</p>
              <p className="mt-2 text-4xl font-black text-[var(--blue-950)]">{totalCartPrice} грн</p>
            </div>

            {/* Payment info */}
            <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="font-semibold text-orange-900">⏰ Строки оплати</p>
              {paymentWindowRulesForDisplay.length > 0 && adminDecisionHoursForDisplay ? (
                <>
                  <ul className="mt-2 space-y-1 text-sm text-orange-800">
                    {paymentWindowRulesForDisplay.map((rule) => {
                      const daysLabel = rule.maxDaysBeforeStart === null
                        ? `${rule.minDaysBeforeStart}+`
                        : `${rule.minDaysBeforeStart}-${rule.maxDaysBeforeStart}`;
                      return (
                        <li key={`${rule.minDaysBeforeStart}-${rule.maxDaysBeforeStart ?? "plus"}`}>
                          • За {daysLabel} дні до гри: <span className="font-bold">{rule.paymentHours} годин</span> на оплату
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-orange-700">
                    Адміністратор переглядає рішення {adminDecisionHoursForDisplay} годин. Готівка і IBAN приймаються однаково.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-xs text-orange-700">Налаштування строків оплати тимчасово недоступні.</p>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--blue-100)] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--blue-700)]">Спосіб оплати</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${selectedPaymentMethod === "cash" ? "border-[var(--green-700)] bg-[var(--green-50)] text-[var(--green-800)]" : "border-[var(--blue-200)] bg-white text-[var(--blue-900)]"}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={selectedPaymentMethod === "cash"}
                    onChange={() => setSelectedPaymentMethod("cash")}
                    className="mr-2"
                  />
                  Готівка на локації
                </label>
                <label className={`cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${selectedPaymentMethod === "iban" ? "border-[var(--green-700)] bg-[var(--green-50)] text-[var(--green-800)]" : "border-[var(--blue-200)] bg-white text-[var(--blue-900)]"}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="iban"
                    checked={selectedPaymentMethod === "iban"}
                    onChange={() => setSelectedPaymentMethod("iban")}
                    className="mr-2"
                  />
                  Переказ на IBAN
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[var(--blue-100)] bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--blue-700)]">Хто вас привів?</p>
              <select
                value={selectedReferralManagerId}
                onChange={(event) => setSelectedReferralManagerId(event.target.value)}
                className="mt-3 w-full rounded-xl border border-[var(--blue-200)] bg-white px-3 py-2.5 text-sm text-[var(--blue-900)] outline-none focus:ring-2 focus:ring-[var(--green-700)]"
              >
                <option value="none">Ніхто / самостійно</option>
                {referralManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>{manager.name}</option>
                ))}
              </select>
            </div>

            {submitError && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {submitError}
              </p>
            )}

            <div className="mt-7 space-y-3">
              {!authResolved ? (
                <button
                  type="button"
                  disabled
                  className="cta-secondary w-full rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white opacity-70"
                >
                  Перевіряємо сесію...
                </button>
              ) : !isAuthorized ? (
                <button
                  type="button"
                  onClick={() => {
                    setCartPopupOpen(false);
                    router.push(`/account/login?redirect=${encodeURIComponent("/?postLogin=checkout")}`);
                  }}
                  className="cta-secondary w-full rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--blue-800)]"
                >
                  Увійти або зареєструватися
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void submitCart();
                  }}
                  disabled={submitBusy || cartItems.length === 0}
                  className="cta-primary w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitBusy ? "Створюємо бронювання..." : cartItems.length === 0 ? "Кошик порожній" : "Підтвердити бронювання"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}