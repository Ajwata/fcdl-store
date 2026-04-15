"use client";

import { useMemo, useState } from "react";

import type { Booking } from "@/lib/bookings";
import type { ClientReview } from "@/lib/client-engagement";
import type { PaymentRequisites } from "@/data/cms-defaults";

type AccountBookingsProps = {
  initialBookings: Booking[];
  initialReviews: ClientReview[];
  paymentRequisites: PaymentRequisites;
};

type OccupiedSlot = {
  id: string;
  startTime: string;
  endTime: string;
  status: Booking["status"];
};

const statusLabel: Record<Booking["status"], string> = {
  pending: "Очікує підтвердження",
  confirmed: "Підтверджено",
  completed: "Завершено",
  cancelled: "Скасовано",
};

const statusClass: Record<Booking["status"], string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const paymentLabel: Record<Booking["paymentStatus"], string> = {
  unpaid: "Не оплачено",
  verification: "Перевірка оплати",
  paid: "Оплачено",
  refunded: "Повернено",
};

const paymentClass: Record<Booking["paymentStatus"], string> = {
  unpaid: "text-rose-600",
  verification: "text-amber-700",
  paid: "text-emerald-700",
  refunded: "text-slate-500",
};

function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function isActiveBooking(booking: Booking): boolean {
  return booking.status === "pending" || booking.status === "confirmed";
}

function isFutureByTime(booking: Booking): boolean {
  return toDateTime(booking.date, booking.endTime).getTime() > Date.now();
}

function hasEndedByTime(booking: Booking): boolean {
  return !isFutureByTime(booking);
}

function sortByDateDesc(items: Booking[]): Booking[] {
  return [...items].sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getRepeatEndTime(startTime: string, durationHours: number): string {
  return toTime(toMinutes(startTime) + durationHours * 60);
}

export function AccountBookings({ initialBookings, initialReviews, paymentRequisites }: AccountBookingsProps) {
  const [bookings, setBookings] = useState<Booking[]>(sortByDateDesc(initialBookings));
  const [activeTab, setActiveTab] = useState<"upcoming" | "history">(
    initialBookings.some((item) => isActiveBooking(item)) ? "upcoming" : "history",
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [reviews, setReviews] = useState<ClientReview[]>(initialReviews);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; text: string }>>({});
  const [repeatDrafts, setRepeatDrafts] = useState<Record<string, { date: string; startTime: string; durationHours: number }>>({});
  const [occupiedSlotsByKey, setOccupiedSlotsByKey] = useState<Record<string, OccupiedSlot[]>>({});
  const [requisitesBookingId, setRequisitesBookingId] = useState<string | null>(null);
  const [requisitesStatus, setRequisitesStatus] = useState("");
  const [requisitesError, setRequisitesError] = useState("");
  const requisitesBooking = requisitesBookingId
    ? bookings.find((item) => item.id === requisitesBookingId) ?? null
    : null;
  const requisitesPurpose = requisitesBooking
    ? `${paymentRequisites.purpose} № бронювання ${requisitesBooking.id}`
    : paymentRequisites.purpose;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setRequisitesError("");
      setRequisitesStatus(`${label} скопійовано`);
    } catch {
      setRequisitesStatus("");
      setRequisitesError("Не вдалося скопіювати");
    }
  };

  const uploadPaymentReceipt = async (bookingId: string, file: File) => {
    setRequisitesError("");
    setRequisitesStatus("");
    setBusyId(bookingId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/account/bookings/${bookingId}/payment-proof`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string; booking?: Booking };
      if (!response.ok || !result.booking) {
        setRequisitesError(result.error ?? "Не вдалося відправити квитанцію");
        return;
      }

      setBookings((prev) => prev.map((item) => (item.id === bookingId ? result.booking! : item)));
      setRequisitesStatus("Квитанцію відправлено. Статус: перевірка оплати.");
    } catch {
      setRequisitesError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setBusyId(null);
    }
  };

  const getAvailabilityKey = (bookingId: string, date: string) => `${bookingId}-${date}`;

  const loadOccupiedSlots = async (booking: Booking, date: string) => {
    const availabilityKey = getAvailabilityKey(booking.id, date);
    try {
      const response = await fetch(`/api/account/availability?date=${encodeURIComponent(date)}&sector=${encodeURIComponent(booking.sector)}`);
      const result = (await response.json()) as { slots?: OccupiedSlot[] };
      if (!response.ok || !result.slots) {
        setOccupiedSlotsByKey((prev) => ({ ...prev, [availabilityKey]: [] }));
        return;
      }
      const slots = result.slots;
      setOccupiedSlotsByKey((prev) => ({ ...prev, [availabilityKey]: slots.filter((slot) => slot.id !== booking.id) }));
    } catch {
      setOccupiedSlotsByKey((prev) => ({ ...prev, [availabilityKey]: [] }));
    }
  };

  const upcomingBookings = useMemo(
    () => bookings.filter((item) => isActiveBooking(item)).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [bookings],
  );

  const historyBookings = useMemo(
    () => bookings.filter((item) => !isActiveBooking(item)).sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`)),
    [bookings],
  );

  const stats = useMemo(() => {
    const total = bookings.length;
    const upcoming = bookings.filter((item) => isActiveBooking(item)).length;
    const cancelled = bookings.filter((item) => item.status === "cancelled").length;
    return { total, upcoming, cancelled };
  }, [bookings]);

  const onCancelBooking = async (bookingId: string) => {
    setStatusMessage("");
    setBusyId(bookingId);

    try {
      const response = await fetch(`/api/account/bookings/${bookingId}/cancel`, { method: "POST" });
      const result = (await response.json()) as { error?: string; booking?: Booking };

      if (!response.ok || !result.booking) {
        setStatusMessage(result.error ?? "Не вдалося скасувати бронювання");
        return;
      }

      setBookings((prev) => prev.map((item) => (item.id === bookingId ? result.booking! : item)));
      setStatusMessage("Бронювання успішно скасовано.");
    } catch {
      setStatusMessage("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setBusyId(null);
    }
  };

  const onRepeatBooking = async (booking: Booking) => {
    const bookingId = booking.id;
    const repeatDraft = repeatDrafts[bookingId];

    if (!repeatDraft) {
      const baseDate = new Date(`${booking.date}T00:00:00`);
      baseDate.setDate(baseDate.getDate() + 7);
      const defaultDate = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;
      setRepeatDrafts((prev) => ({
        ...prev,
        [bookingId]: {
          date: defaultDate,
          startTime: booking.startTime,
          durationHours: booking.durationHours,
        },
      }));
      void loadOccupiedSlots(booking, defaultDate);
      return;
    }

    const repeatEndTime = getRepeatEndTime(repeatDraft.startTime, repeatDraft.durationHours);
    const availabilityKey = getAvailabilityKey(booking.id, repeatDraft.date);
    const occupiedSlots = occupiedSlotsByKey[availabilityKey] ?? [];
    const hasClientConflict = occupiedSlots.some((slot) =>
      overlaps(repeatDraft.startTime, repeatEndTime, slot.startTime, slot.endTime),
    );
    if (hasClientConflict) {
      setStatusMessage("Обраний час перетинається із зайнятим слотом. Оберіть інший час.");
      return;
    }

    setStatusMessage("");
    setBusyId(bookingId);
    try {
      const response = await fetch(`/api/account/bookings/${bookingId}/repeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repeatDraft),
      });
      const result = (await response.json()) as { error?: string; booking?: Booking };
      if (!response.ok || !result.booking) {
        setStatusMessage(result.error ?? "Не вдалося повторити бронювання");
        return;
      }
      setBookings((prev) => sortByDateDesc([result.booking!, ...prev]));
      setRepeatDrafts((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      setStatusMessage("Нове бронювання створено.");
    } catch {
      setStatusMessage("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setBusyId(null);
    }
  };

  const onSubmitReview = async (bookingId: string) => {
    const draft = reviewDrafts[bookingId] ?? { rating: 5, text: "" };
    setBusyId(bookingId);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/account/bookings/${bookingId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = (await response.json()) as { error?: string; review?: ClientReview };
      if (!response.ok || !result.review) {
        setStatusMessage(result.error ?? "Не вдалося зберегти відгук");
        return;
      }
      setReviews((prev) => {
        const exists = prev.some((item) => item.bookingId === result.review!.bookingId);
        if (exists) {
          return prev.map((item) => (item.bookingId === result.review!.bookingId ? result.review! : item));
        }
        return [result.review!, ...prev];
      });
      setStatusMessage("Відгук збережено. Дякуємо!");
    } catch {
      setStatusMessage("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setBusyId(null);
    }
  };

  const tabItems = activeTab === "upcoming" ? upcomingBookings : historyBookings;
  const reviewByBookingId = new Map(reviews.map((item) => [item.bookingId, item]));

  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Усього бронювань</p>
          <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Активні майбутні</p>
          <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{stats.upcoming}</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Скасовані</p>
          <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{stats.cancelled}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_16px_40px_rgba(8,26,51,0.1)] sm:p-8">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "upcoming"
                ? "bg-[var(--blue-900)] text-white"
                : "border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
            }`}
          >
            Майбутні бронювання
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "history"
                ? "bg-[var(--blue-900)] text-white"
                : "border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
            }`}
          >
            Історія
          </button>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-3 text-sm font-semibold text-[var(--blue-900)]">
            {statusMessage}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {tabItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--blue-200)] bg-white px-6 py-10 text-center text-sm text-slate-600 sm:col-span-2">
              {activeTab === "upcoming" && historyBookings.length > 0
                ? "У майбутніх записах порожньо. Перейдіть у вкладку 'Історія' - там є ваші бронювання."
                : "Тут поки немає записів у цьому розділі."}
            </div>
          ) : (
            tabItems.map((booking) => {
              const canCancel = isFutureByTime(booking) && booking.status === "pending";
              const existingReview: ClientReview | null = reviewByBookingId.get(booking.id) ?? null;
              const canOpenRequisites =
                (booking.status === "pending" || booking.status === "confirmed") &&
                booking.paymentStatus === "unpaid";
              const canLeaveReview =
                booking.status !== "cancelled" &&
                booking.paymentStatus === "paid" &&
                hasEndedByTime(booking);

              return (
                <article key={booking.id} className="rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--blue-700)]">Поле {booking.sector}</p>
                      <h3 className="mt-1 text-xl font-bold text-[var(--blue-950)]">{booking.date}</h3>
                      <p className="text-sm text-slate-600">{booking.startTime} - {booking.endTime} ({booking.durationHours} год)</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[booking.status]}`}>{statusLabel[booking.status]}</span>
                      <span className={`text-xs font-semibold ${paymentClass[booking.paymentStatus]}`}>{paymentLabel[booking.paymentStatus]}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-bold text-[var(--blue-950)]">{booking.totalPrice.toLocaleString("uk-UA")} грн</p>
                    <div className="flex flex-wrap gap-2">
                      {canOpenRequisites && (
                        <button
                          type="button"
                          onClick={() => {
                            setRequisitesBookingId(booking.id);
                            setRequisitesStatus("");
                            setRequisitesError("");
                          }}
                          className="rounded-full border border-[var(--green-200)] bg-[var(--green-100)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--green-800)]"
                        >
                          Отримати реквізити
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRepeatBooking(booking)}
                        disabled={busyId === booking.id}
                        className="rounded-full border border-[var(--blue-200)] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]"
                      >
                        {busyId === booking.id ? "..." : "Повторити"}
                      </button>
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => onCancelBooking(booking.id)}
                          disabled={busyId === booking.id}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-rose-700 disabled:opacity-60"
                        >
                          {busyId === booking.id ? "Скасування..." : "Скасувати"}
                        </button>
                      )}
                    </div>
                  </div>

                  {repeatDrafts[booking.id] && (
                    <div className="mt-3 space-y-2 rounded-xl border border-[var(--blue-100)] bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-700)]">Параметри повтору</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <input
                          type="date"
                          value={repeatDrafts[booking.id].date}
                          onChange={(event) =>
                              {
                                const nextDate = event.target.value;
                                setRepeatDrafts((prev) => ({
                                  ...prev,
                                  [booking.id]: {
                                    ...prev[booking.id],
                                    date: nextDate,
                                  },
                                }));
                                void loadOccupiedSlots(booking, nextDate);
                              }
                          }
                          className="rounded-xl border border-[var(--blue-200)] bg-white px-2 py-1.5 text-sm text-[var(--blue-900)]"
                        />
                        <input
                          type="time"
                          value={repeatDrafts[booking.id].startTime}
                          onChange={(event) =>
                            setRepeatDrafts((prev) => ({
                              ...prev,
                              [booking.id]: {
                                ...prev[booking.id],
                                startTime: event.target.value,
                              },
                            }))
                          }
                          className="rounded-xl border border-[var(--blue-200)] bg-white px-2 py-1.5 text-sm text-[var(--blue-900)]"
                        />
                        <select
                          value={repeatDrafts[booking.id].durationHours}
                          onChange={(event) =>
                            setRepeatDrafts((prev) => ({
                              ...prev,
                              [booking.id]: {
                                ...prev[booking.id],
                                durationHours: Number(event.target.value),
                              },
                            }))
                          }
                          className="rounded-xl border border-[var(--blue-200)] bg-white px-2 py-1.5 text-sm text-[var(--blue-900)]"
                        >
                          {Array.from({ length: 12 }, (_, index) => index + 1).map((hours) => (
                            <option key={hours} value={hours}>{hours} год</option>
                          ))}
                        </select>
                      </div>

                      <div className="rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-2 text-xs text-slate-600">
                        <p className="font-bold uppercase tracking-[0.08em] text-[var(--blue-700)]">Зайняті слоти на цю дату</p>
                        {(occupiedSlotsByKey[getAvailabilityKey(booking.id, repeatDrafts[booking.id].date)] ?? []).length === 0 ? (
                          <p className="mt-1">Наразі вільно</p>
                        ) : (
                          <p className="mt-1">
                            {(occupiedSlotsByKey[getAvailabilityKey(booking.id, repeatDrafts[booking.id].date)] ?? [])
                              .map((slot) => `${slot.startTime}-${slot.endTime}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => onRepeatBooking(booking)}
                          disabled={busyId === booking.id}
                          className="rounded-full bg-[var(--green-700)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] !text-white disabled:opacity-60"
                        >
                          {busyId === booking.id ? "Створення..." : "Підтвердити повтор"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setRepeatDrafts((prev) => {
                              const next = { ...prev };
                              delete next[booking.id];
                              return next;
                            })
                          }
                          className="rounded-full border border-[var(--blue-200)] bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]"
                        >
                          Скасувати
                        </button>
                      </div>
                    </div>
                  )}

                  {canLeaveReview && !existingReview && (
                    <div className="mt-4 space-y-2 rounded-xl border border-[var(--blue-100)] bg-white p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-700)]">Оцінка та відгук</p>
                      <div className="flex flex-wrap gap-2">
                        <select
                          value={(reviewDrafts[booking.id]?.rating ?? 5).toString()}
                          onChange={(event) =>
                            setReviewDrafts((prev) => ({
                              ...prev,
                              [booking.id]: {
                                rating: Number(event.target.value),
                                text: prev[booking.id]?.text ?? "",
                              },
                            }))
                          }
                          className="rounded-xl border border-[var(--blue-200)] bg-white px-2 py-1 text-sm text-[var(--blue-900)]"
                        >
                          {[5, 4, 3, 2, 1].map((star) => (
                            <option key={star} value={star}>{star} з 5</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onSubmitReview(booking.id)}
                          disabled={busyId === booking.id}
                          className="rounded-full border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]"
                        >
                          {busyId === booking.id ? "Надсилання..." : "Надіслати"}
                        </button>
                      </div>
                      <textarea
                        value={reviewDrafts[booking.id]?.text ?? ""}
                        onChange={(event) =>
                          setReviewDrafts((prev) => ({
                            ...prev,
                            [booking.id]: {
                              rating: prev[booking.id]?.rating ?? 5,
                              text: event.target.value,
                            },
                          }))
                        }
                        rows={2}
                        className="w-full rounded-xl border border-[var(--blue-200)] bg-white px-3 py-2 text-sm text-[var(--blue-950)]"
                        placeholder="Поділіться враженням про поле та сервіс"
                      />
                    </div>
                  )}

                  {canLeaveReview && existingReview && (
                    <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">Відгук збережено</p>
                      <p className="text-sm font-semibold text-emerald-900">Оцінка: {existingReview.rating} з 5</p>
                      <p className="text-sm text-emerald-900">{existingReview.text || "Без текстового коментаря"}</p>
                      <p className="text-xs text-emerald-700">Відгук можна залишити лише один раз для цього бронювання.</p>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {requisitesBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,51,0.65)] px-4 py-6">
          <div className="w-full max-w-xl rounded-[24px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_24px_60px_rgba(8,26,51,0.18)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green-700)]">Оплата</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--blue-950)]">Реквізити для переказу</h3>
              </div>
              <button
                type="button"
                onClick={() => setRequisitesBookingId(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4 text-sm text-[var(--blue-900)]">
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Отримувач:</span> {paymentRequisites.recipient}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.recipient, "Отримувач")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">IBAN:</span> {paymentRequisites.iban}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.iban, "IBAN")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Банк:</span> {paymentRequisites.bank}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.bank, "Банк")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Призначення:</span> {requisitesPurpose}</p>
                <button type="button" onClick={() => void copyToClipboard(requisitesPurpose, "Призначення")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--blue-100)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--blue-950)]">Після оплати надішліть квитанцію</p>
              <label className={`mt-3 inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] ${busyId === requisitesBookingId ? "cursor-not-allowed bg-slate-200 text-slate-400" : "bg-[var(--green-700)] text-white hover:bg-[var(--green-800)]"}`}>
                {busyId === requisitesBookingId ? "Завантаження..." : "Відправити квитанцію"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busyId === requisitesBookingId}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file || !requisitesBookingId) return;
                    void uploadPaymentReceipt(requisitesBookingId, file);
                  }}
                />
              </label>
              {requisitesStatus && <p className="mt-2 text-xs font-semibold text-emerald-700">{requisitesStatus}</p>}
              {requisitesError && <p className="mt-2 text-xs font-semibold text-rose-700">{requisitesError}</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
