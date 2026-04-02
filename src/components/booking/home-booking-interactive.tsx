"use client";

import { useMemo, useState } from "react";

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

const sectorPrice: Record<Sector, number> = {
  "№1": 900,
  "№2": 800,
  "№3": 900,
  "№4": 2500,
};

const sectors: Array<{ name: Sector; note: string; dimensions: string }> = [
  { name: "№1", note: "До 30 гравців • Парні матчі та тренування", dimensions: "Ширина 20м • Довжина 40м" },
  { name: "№2", note: "Вузьке поле • Функціональне тренування", dimensions: "Ширина 17м • Довжина 40м" },
  { name: "№3", note: "Стандартне • Офіційні матчі та турніри", dimensions: "Ширина 20м • Довжина 40м" },
  { name: "№4", note: "Повнорозмірне • Професійні матчі та чемпіонати", dimensions: "Ширина 60м • Довжина 40м" },
];

const durationOptions = Array.from({ length: 13 }, (_, index) => index + 1);

// Тимчасові зайняті слоти. Пізніше це має приходити з backend.
const mockedBookedSlots: Array<{ date: string; sector: Sector; startHour: number; durationHours: number }> = [
  { date: "2026-04-03", sector: "№2", startHour: 18, durationHours: 2 },
  { date: "2026-04-04", sector: "№1", startHour: 9, durationHours: 1 },
  { date: "2026-04-05", sector: "№4", startHour: 20, durationHours: 1 },
];

function toHour(slot: string): number {
  return Number(slot.split(":")[0]);
}

function toTime(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function HomeBookingInteractive() {
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [nextCartItemId, setNextCartItemId] = useState(1);
  const [bookingPopupOpen, setBookingPopupOpen] = useState(false);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);

  const isAuthorized = false;
  const pricePerHour = selectedSector ? sectorPrice[selectedSector] : 0;
  const totalPrice = selectedDuration ? pricePerHour * selectedDuration : 0;
  const popupOpen = bookingPopupOpen;

  const removeCartItem = (id: number) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  };
  const operatingHours = useMemo(() => {
    return { startHour: 6, endHour: 22 };
  }, []);

  const availableStartSlots = useMemo(() => {
    if (!selectedDate || !selectedSector) {
      return [] as Array<{ slot: string; disabled: boolean }>;
    }

    return Array.from({ length: operatingHours.endHour - operatingHours.startHour }, (_, index) => {
      const startHour = operatingHours.startHour + index;
      const blocked = mockedBookedSlots.some((item) =>
        item.date === selectedDate &&
        item.sector === selectedSector &&
        rangesOverlap(startHour, startHour + 1, item.startHour, item.startHour + item.durationHours),
      );

      return {
        slot: toTime(startHour),
        disabled: blocked,
      };
    });
  }, [selectedDate, selectedSector, operatingHours]);

  const availableDurations = useMemo(() => {
    if (!selectedDate || !selectedSector || !selectedSlot) {
      return [] as Array<{ hours: number; disabled: boolean }>;
    }

    const startHour = toHour(selectedSlot);

    return durationOptions.map((hours) => {
      const endHour = startHour + hours;
      const outOfSchedule = endHour > operatingHours.endHour;

      const intersectsBooked = mockedBookedSlots.some((item) =>
        item.date === selectedDate &&
        item.sector === selectedSector &&
        rangesOverlap(startHour, endHour, item.startHour, item.startHour + item.durationHours),
      );

      return {
        hours,
        disabled: outOfSchedule || intersectsBooked,
      };
    });
  }, [selectedDate, selectedSector, selectedSlot, operatingHours]);

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

  const addCurrentSelectionToCart = () => {
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
  };

  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <section id="booking" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Ключовий блок</p>
          <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
            Обери сектор і час гри
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Натисни на сектор поля і пройди через зручний попап: сектор, дата, час — і бронювання у кошику.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 1</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Сектор</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 2</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Дата і час</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 3</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Оплата</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[34px] border border-[var(--border-soft)] bg-[linear-gradient(140deg,rgba(255,255,255,0.98)_0%,rgba(242,248,255,0.95)_58%,rgba(234,245,255,0.96)_100%)] p-5 shadow-[0_24px_90px_rgba(8,26,51,0.1)] backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-[var(--blue-200)]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-40 w-40 rounded-full bg-[var(--green-200)]/55 blur-3xl" />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {sectors.map(({ name, note }) => {
            const isSelected = selectedSector === name;

            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelectedSector(name);
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
                      name === "№2"
                        ? "repeating-linear-gradient(to right,#1c7340 0%,#1c7340 12.5%,#186838 12.5%,#186838 25%)"
                        : "repeating-linear-gradient(to bottom,#1c7340 0%,#1c7340 12.5%,#186838 12.5%,#186838 25%)",
                  }}
                >
                  {/* Field outline */}
                  <div className="absolute inset-[10%] border border-white/55" />

                  {name === "№2" ? (
                    /* 40×17m, split vertically — no goals */
                    <>
                      <div className="absolute bottom-[10%] left-1/2 top-[10%] w-px -translate-x-1/2 bg-white/55" />
                      {/* Dimensions */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/80">17м</div>
                      <div className="absolute left-0.5 top-1/2 -translate-y-1/2 rounded bg-white/10 px-1 py-0.5 text-[9px] font-bold text-white/80">40м</div>
                    </>
                  ) : name === "№4" ? (
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
                  <p className="text-base font-bold text-[var(--blue-950)]">{name}</p>
                  <p className="mt-1.5 text-sm font-normal leading-snug text-[var(--blue-800)]">{note}</p>
                  <p className="mt-auto pt-3 text-lg font-bold text-[var(--green-700)]">Від {sectorPrice[name]} грн/год</p>
                </div>
              </button>
            );
          })}
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
                <h3 className="mt-2 text-2xl font-bold text-[var(--blue-950)] sm:text-3xl">{selectedSector ?? "Обери сектор"}</h3>
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
                <p className="text-sm font-semibold text-[var(--blue-900)]">Крок 1. Обери сектор</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sectors.map(({ name, note }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedSector(name);
                        setSelectedDate("");
                        setSelectedSlot(null);
                        setSelectedDuration(null);
                      }}
                      className={`ui-chip-button rounded-[14px] border px-3 py-3 text-left transition ${
                        selectedSector === name
                          ? "border-[var(--green-700)] bg-[var(--green-100)]/65"
                          : "border-[var(--blue-100)] bg-[var(--blue-50)] hover:border-[var(--green-700)]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--blue-950)]">{name}</p>
                      <p className="mt-0.5 text-xs text-[var(--blue-800)]">{note}</p>
                      <p className="mt-2 text-xs font-bold text-[var(--green-700)]">Від {sectorPrice[name]} грн</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "date" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Крок 2. Обери дату</p>
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
                <p className="text-sm font-semibold text-[var(--blue-900)]">Крок 3. Обери час</p>
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
                      className="ui-chip-button rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-3 text-sm font-bold text-[var(--blue-900)] transition hover:border-[var(--green-700)] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      {slotItem.slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "duration" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-[var(--blue-900)]">Крок 4. Обери тривалість</p>
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
                <p className="text-sm font-semibold text-[var(--blue-900)]">Крок 5. Підтвердження</p>
                <div className="rounded-[16px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <p className="text-xs text-[var(--blue-700)]">Сектор: <span className="font-semibold text-[var(--blue-950)]">{selectedSector}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Date: <span className="font-semibold text-[var(--blue-950)]">{selectedDate}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Hour: <span className="font-semibold text-[var(--blue-950)]">{selectedSlot}</span></p>
                  <p className="mt-1 text-xs text-[var(--blue-700)]">Duration: <span className="font-semibold text-[var(--blue-950)]">{selectedDuration} год</span></p>
                  <p className="mt-3 border-t border-[var(--blue-100)] pt-3 text-sm text-[var(--blue-700)]">Rate: <span className="font-semibold text-[var(--blue-950)]">{pricePerHour} грн/год</span></p>
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
                  <p className="font-bold text-[var(--blue-950)]">{item.sector}</p>
                  <p>Дата: {item.date}</p>
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

            <div className="mt-7 space-y-3">
              {!isAuthorized ? (
                <button
                  type="button"
                  className="cta-secondary w-full rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--blue-800)]"
                >
                  Увійти або зареєструватися
                </button>
              ) : (
                <button
                  type="button"
                  className="cta-primary w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
                >
                  Оплатити
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}