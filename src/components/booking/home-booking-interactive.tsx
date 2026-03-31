"use client";

import { useMemo, useState } from "react";

type Sector = "Лівий" | "Центр" | "Правий" | "Усе поле";

type CartItem = {
  id: number;
  sector: Sector;
  date: string;
  slot: string;
  price: number;
};

const sectorPrice: Record<Sector, number> = {
  "Лівий": 900,
  "Центр": 1100,
  "Правий": 900,
  "Усе поле": 2500,
};

const slots = ["15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const sectors: Array<{ name: Sector; note: string }> = [
  { name: "Лівий", note: "Оптимально для 6x6" },
  { name: "Центр", note: "Найкращий огляд" },
  { name: "Правий", note: "Підходить для тренувань" },
  { name: "Усе поле", note: "Повний формат матчу" },
];

export function HomeBookingInteractive() {
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [nextCartItemId, setNextCartItemId] = useState(1);
  const [bookingPopupOpen, setBookingPopupOpen] = useState(false);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);

  const isAuthorized = false;
  const price = selectedSector ? sectorPrice[selectedSector] : 0;
  const popupOpen = bookingPopupOpen;

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
    return "summary";
  }, [selectedSector, selectedDate, selectedSlot]);

  const closePopup = () => {
    setBookingPopupOpen(false);
    setSelectedSector(null);
    setSelectedDate("");
    setSelectedSlot(null);
  };

  const startBookingFromPopup = () => {
    setSelectedSector(null);
    setSelectedDate("");
    setSelectedSlot(null);
    setBookingPopupOpen(true);
  };

  const addCurrentSelectionToCart = () => {
    if (!selectedSector || !selectedDate || !selectedSlot) {
      return;
    }

    setCartItems((prev) => [
      ...prev,
      {
        id: nextCartItemId,
        sector: selectedSector,
        date: selectedDate,
        slot: selectedSlot,
        price,
      },
    ]);
    setNextCartItemId((prev) => prev + 1);
    setCartPopupOpen(true);
  };

  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  return (
    <section id="booking" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Ключовий блок</p>
          <h2 className="mt-3 font-display text-5xl uppercase leading-none text-[var(--blue-950)] sm:text-6xl">
            Обери сектор і час гри
          </h2>
        </div>
        <p className="max-w-2xl text-base leading-7 text-slate-600">
          Натисни на сектор поля, обери дату та час, додай бронювання до кошика і переходь до оплати.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 1</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Сектор</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 2</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Дата і час</p>
        </div>
        <div className="rounded-2xl border border-[var(--blue-100)] bg-white/82 px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--blue-700)]">Крок 3</p>
          <p className="mt-1 text-sm font-bold text-[var(--blue-950)]">Кошик</p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[34px] border border-[var(--border-soft)] bg-[linear-gradient(140deg,rgba(255,255,255,0.98)_0%,rgba(242,248,255,0.95)_58%,rgba(234,245,255,0.96)_100%)] p-5 shadow-[0_24px_90px_rgba(8,26,51,0.1)] backdrop-blur-sm sm:p-8">
        <div className="pointer-events-none absolute -left-16 top-10 h-44 w-44 rounded-full bg-[var(--blue-200)]/45 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-8 h-40 w-40 rounded-full bg-[var(--green-200)]/55 blur-3xl" />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden rounded-[28px] border border-white/45 bg-gradient-to-br from-[#103f25] via-[#17653b] to-[#0f4f2d] p-6 sm:p-8">
            <div className="absolute inset-5 rounded-[20px] border border-white/55" />
            <div className="absolute inset-y-5 left-1/2 w-px -translate-x-1/2 bg-white/45" />
            <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-white/45" />
            <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/55" />

            <div className="relative z-10 mb-4 flex items-center justify-between gap-3 pl-4 pr-3 sm:px-0">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/78">Інтерактивне поле</p>
                <p className="mt-1 text-[11px] font-semibold text-white/62">Обери сектор одним кліком</p>
              </div>
              <p className="rounded-full border border-white/24 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/72">
                Live selection
              </p>
            </div>

            <div className="relative z-10 grid min-h-[300px] gap-3 sm:min-h-[360px] sm:grid-cols-2">
              {sectors.map(({ name, note }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setSelectedSector(name);
                    setSelectedDate("");
                    setSelectedSlot(null);
                    setBookingPopupOpen(true);
                  }}
                  className={`ui-chip-button rounded-[18px] border p-4 text-left backdrop-blur-sm transition ${
                    selectedSector === name
                      ? "border-white/80 bg-white/34 shadow-[0_18px_36px_rgba(6,28,17,0.3)]"
                      : "border-white/28 bg-white/12 hover:border-white/50 hover:bg-white/22"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/24 bg-white/10 text-white/80">
                      <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
                    </div>
                    {selectedSector === name && (
                      <span className="rounded-full border border-white/25 bg-[#0f3c24]/70 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--green-100)]">
                        Обрано
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/68">Сектор</p>
                  <p className="mt-1 text-2xl font-black text-white">{name}</p>
                  <p className="mt-1 text-xs text-white/72">{note}</p>

                  <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/18 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/58">Ціна від</span>
                    <span className="text-sm font-black text-white">{sectorPrice[name]} грн</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="rounded-[28px] border border-[var(--blue-100)] bg-white/88 p-6 shadow-[0_16px_36px_rgba(8,26,51,0.07)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--blue-700)]">Кошик</p>
                <h3 className="mt-2 text-2xl font-black text-[var(--blue-950)]">Твій вибір</h3>
              </div>
              <span className="rounded-full border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--blue-700)]">
                {cartItems.length} позицій
              </span>
            </div>
            {cartItems.length === 0 ? (
              <div className="mt-6 rounded-[14px] border border-dashed border-[var(--blue-200)] px-4 py-5 text-sm text-slate-500">
                Кошик порожній. Обери сектор, дату та час, щоб додати бронювання.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="rounded-[14px] border border-[var(--blue-100)] bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_8px_20px_rgba(8,26,51,0.04)]">
                    <p className="font-bold text-[var(--blue-950)]">{item.sector}</p>
                    <p>{item.date}</p>
                    <p>{item.slot}</p>
                    <p className="mt-1 font-semibold text-[var(--green-700)]">{item.price} грн</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-7 border-t border-[var(--blue-100)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">До оплати</p>
              <p className="mt-2 text-4xl font-black text-[var(--blue-950)]">{totalCartPrice} грн</p>
            </div>

            {cartItems.length === 0 ? (
              <button
                type="button"
                onClick={startBookingFromPopup}
                className="cta-primary mt-7 w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
              >
                Почати бронювання
              </button>
            ) : (
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
            )}
          </aside>
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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Бронювання сектора</p>
                <h3 className="mt-2 text-3xl font-black text-[var(--blue-950)]">{selectedSector}</h3>
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
                <p className="text-sm font-semibold text-slate-600">Крок 1. Обери сектор</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {sectors.map(({ name, note }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedSector(name);
                        setSelectedDate("");
                        setSelectedSlot(null);
                      }}
                      className={`ui-chip-button rounded-[14px] border px-3 py-3 text-left transition ${
                        selectedSector === name
                          ? "border-[var(--green-700)] bg-[var(--green-100)]/65"
                          : "border-[var(--blue-100)] bg-[var(--blue-50)] hover:border-[var(--green-700)]"
                      }`}
                    >
                      <p className="text-sm font-black text-[var(--blue-950)]">{name}</p>
                      <p className="mt-1 text-xs text-slate-600">{note}</p>
                      <p className="mt-2 text-xs font-bold text-[var(--green-700)]">Від {sectorPrice[name]} грн</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "date" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-slate-600">Крок 2. Обери дату</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="mt-3 w-full rounded-[14px] border border-[var(--blue-100)] px-4 py-3 text-[var(--blue-950)]"
                />
              </div>
            )}

            {popupStep === "slots" && (
              <div className="mt-7">
                <p className="text-sm font-semibold text-slate-600">Крок 3. Обери час</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className="ui-chip-button rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-3 text-sm font-bold text-[var(--blue-900)] transition hover:border-[var(--green-700)]"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {popupStep === "summary" && (
              <div className="mt-7 space-y-4">
                <p className="text-sm font-semibold text-slate-600">Крок 4. Підтвердження</p>
                <div className="rounded-[16px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <p className="text-sm text-slate-600">Сектор: {selectedSector}</p>
                  <p className="text-sm text-slate-600">Дата: {selectedDate}</p>
                  <p className="text-sm text-slate-600">Час: {selectedSlot}</p>
                  <p className="mt-2 text-2xl font-black text-[var(--blue-950)]">{price} грн</p>
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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Кошик</p>
                <h3 className="mt-2 text-3xl font-black text-[var(--blue-950)]">Твої бронювання</h3>
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
                  <p>Час: {item.slot}</p>
                  <p className="mt-1 font-semibold text-[var(--green-700)]">{item.price} грн</p>
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