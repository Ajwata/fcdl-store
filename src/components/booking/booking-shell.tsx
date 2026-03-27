"use client";

import { useState } from "react";

import { bookingDays, bookingSectors, bookingSlots } from "@/data/site-content";

const sectorKeyMap = {
  "Лівий": "left",
  "Центр": "center",
  "Правий": "right",
  "Усе поле": "full",
} as const;

export function BookingShell() {
  const [selectedDay, setSelectedDay] = useState(bookingDays[3]?.id ?? bookingDays[0].id);
  const [selectedSector, setSelectedSector] = useState<(typeof bookingSectors)[number]>("Усе поле");
  const [selectedTime, setSelectedTime] = useState("20:00");

  const currentKey = sectorKeyMap[selectedSector];
  const visibleSlots = bookingSlots.filter((slot) => slot[currentKey] !== "Недоступно");
  const selectedSlot = visibleSlots.find((slot) => slot.time === selectedTime) ?? visibleSlots[0];
  const selectedStatus = selectedSlot?.[currentKey] ?? "Вільно";
  const total = selectedSector === "Усе поле" ? "2500 грн" : "900 грн";

  return (
    <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
      <aside className="booking-panel animate-rise">
        <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--blue-700)]">Крок 1</p>
        <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] text-[var(--blue-950)]">
          Вибери дату, сектор і слот
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
          Обери зручний час для гри, переглянь доступні сектори та переходь до оформлення бронювання.
        </p>

        <div className="mt-8 space-y-4">
          <div className="rounded-[28px] border border-[var(--blue-100)] bg-white p-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500">Обрана дата</p>
            <p className="mt-3 text-3xl font-black text-[var(--blue-950)]">
              {bookingDays.find((day) => day.id === selectedDay)?.label}
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--blue-100)] bg-white p-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500">Сектор</p>
            <p className="mt-3 text-3xl font-black text-[var(--blue-950)]">{selectedSector}</p>
          </div>
          <div className="rounded-[28px] border border-[var(--blue-100)] bg-white p-5">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500">Час</p>
            <p className="mt-3 text-3xl font-black text-[var(--blue-950)]">{selectedTime} - 21:00</p>
            <p className="mt-2 text-sm font-semibold text-[var(--green-700)]">Статус: {selectedStatus}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[32px] bg-[var(--blue-950)] p-6 text-white">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-white/55">Поточна вартість</p>
          <p className="mt-2 font-display text-5xl uppercase">{total}</p>
          <p className="mt-3 text-sm leading-6 text-white/70">Ціна розрахована за обраний сектор і часовий слот.</p>
        </div>
      </aside>

      <section className="space-y-6">
        <div className="booking-panel animate-rise" style={{ animationDelay: "120ms" }}>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--blue-700)]">Крок 2</p>
          <h2 className="mt-4 text-2xl font-black text-[var(--blue-950)]">Оберіть день</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {bookingDays.map((day) => {
              const active = day.id === selectedDay;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDay(day.id)}
                  className={`rounded-[24px] border px-4 py-4 text-left transition ${
                    active
                      ? "border-[var(--blue-900)] bg-[var(--blue-900)] !text-white"
                      : "border-[var(--blue-800)] bg-[var(--blue-700)] !text-white hover:border-[var(--green-700)] hover:bg-[var(--blue-800)] hover:!text-white"
                  }`}
                >
                  <p className="text-xs font-extrabold uppercase tracking-[0.16em] opacity-70">{day.weekday}</p>
                  <p className="mt-3 text-lg font-black">{day.label}</p>
                  <p className="text-sm opacity-75">{day.date}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="booking-panel animate-rise" style={{ animationDelay: "220ms" }}>
          <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--blue-700)]">Крок 3</p>
          <h2 className="mt-4 text-2xl font-black text-[var(--blue-950)]">Оберіть сектор</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {bookingSectors.map((sector) => {
              const active = sector === selectedSector;

              return (
                <button
                  key={sector}
                  type="button"
                  onClick={() => setSelectedSector(sector)}
                  className={`rounded-full px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] transition ${
                    active
                      ? "bg-[var(--green-700)] !text-white"
                      : "border border-[var(--green-800)] bg-[var(--green-800)] !text-white hover:bg-[var(--green-700)] hover:!text-white"
                  }`}
                >
                  {sector}
                </button>
              );
            })}
          </div>
        </div>

        <div className="booking-panel animate-rise" style={{ animationDelay: "320ms" }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--blue-700)]">Крок 4</p>
              <h2 className="mt-4 text-2xl font-black text-[var(--blue-950)]">Доступні слоти</h2>
            </div>
            <p className="text-sm text-slate-500">Недоступні комбінації прибрано з урахуванням сектора</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSlots.map((slot) => {
              const state = slot[currentKey];
              const active = slot.time === selectedTime;
              const isBooked = state === "Зайнято";

              return (
                <button
                  key={slot.time}
                  type="button"
                  onClick={() => setSelectedTime(slot.time)}
                  className={`rounded-[24px] border p-5 text-left transition ${
                    active
                      ? "border-[var(--blue-900)] bg-[var(--blue-900)] !text-white"
                      : isBooked
                        ? "border-[#9d3434] bg-[#b63a3a] !text-white"
                        : "border-[var(--blue-800)] bg-[var(--blue-700)] !text-white hover:border-[var(--green-700)] hover:bg-[var(--blue-800)] hover:!text-white"
                  }`}
                >
                  <p className="text-sm font-extrabold uppercase tracking-[0.16em] opacity-70">{selectedSector}</p>
                  <p className="mt-3 text-3xl font-black">{slot.time}</p>
                  <p className="mt-2 text-sm font-semibold">{state}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}