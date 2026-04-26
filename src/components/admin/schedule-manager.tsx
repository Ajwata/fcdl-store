"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const SECTORS = ["№1", "№2", "№3", "№4"];
const START_HOUR = 6;
const END_HOUR = 22;

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function toTime(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function toDateInputDefault(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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

type Mode = "single" | "range";
type SlotStatus = "free" | "blocked" | "booked";

type BookedMeta = {
  status: string;
  paymentStatus: string;
  bookedBy?: string;
};

type SlotInfo = {
  status: SlotStatus;
  blockedReason?: string;
  booked?: BookedMeta;
};

type ApiSlot = {
  id: string;
  sector: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  bookedBy?: string;
};

export function ScheduleManager() {
  const [mode, setMode] = useState<Mode>("single");

  // ── Single-day state ─────────────────────────────────────────────────────
  const [date, setDate] = useState(toDateInputDefault);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [sector, setSector] = useState(SECTORS[0]);
  const [slots, setSlots] = useState<Record<number, SlotInfo>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Range state ──────────────────────────────────────────────────────────
  const [rangeFrom, setRangeFrom] = useState(toDateInputDefault);
  const [rangeTo, setRangeTo] = useState(toDateInputDefault);
  const [rangeSectors, setRangeSectors] = useState<string[]>([...SECTORS]);
  const [rangeHours, setRangeHours] = useState<Set<number>>(new Set());
  const [rangeSaving, setRangeSaving] = useState(false);
  const [rangeMessage, setRangeMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const loadSlots = useCallback(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !sector) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/admin/availability?date=${encodeURIComponent(date)}&sector=${encodeURIComponent(sector)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { slots?: ApiSlot[] };
      const apiSlots = data.slots ?? [];

      const map: Record<number, SlotInfo> = {};
      for (const h of HOURS) {
        const time = toTime(h);
        const match = apiSlots.find((s) => s.sector === sector && s.startTime <= time && s.endTime > time);
        if (!match) {
          map[h] = { status: "free" };
        } else if (match.status === "blocked") {
          map[h] = { status: "blocked", blockedReason: match.bookedBy };
        } else {
          map[h] = {
            status: "booked",
            booked: { status: match.status, paymentStatus: match.paymentStatus, bookedBy: match.bookedBy },
          };
        }
      }
      setSlots(map);
    } catch {
      setMessage({ text: "Помилка завантаження", ok: false });
    } finally {
      setLoading(false);
    }
  }, [date, sector]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const [yearRaw, monthRaw] = date.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
    setCalendarMonth((prev) => {
      if (prev.getFullYear() === year && prev.getMonth() === month - 1) {
        return prev;
      }
      return new Date(year, month - 1, 1);
    });
  }, [date]);

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
      const d = new Date(year, month - 1, dayNumber);
      days.push({ iso: toIsoDate(d), dayNumber, inCurrentMonth: false });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
      const d = new Date(year, month, dayNumber);
      days.push({ iso: toIsoDate(d), dayNumber, inCurrentMonth: true });
    }

    const trailing = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
    for (let index = 1; index <= trailing; index++) {
      const d = new Date(year, month + 1, index);
      days.push({ iso: toIsoDate(d), dayNumber: index, inCurrentMonth: false });
    }

    return days;
  }, [calendarMonth]);

  function toggleHour(hour: number) {
    const current = slots[hour];
    if (!current || current.status === "booked") return;
    setSlots((prev) => ({
      ...prev,
      [hour]: { status: current.status === "blocked" ? "free" : "blocked" },
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);

    try {
      const blocked = HOURS.filter((h) => slots[h]?.status === "blocked").map((h) => ({
        startTime: toTime(h),
        endTime: toTime(h + 1),
      }));

      const res = await fetch("/api/admin/blocked-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, sector, slots: blocked }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Помилка збереження");
      }

      setMessage({ text: `Збережено: ${blocked.length} заблоковано`, ok: true });
      // Reload to get fresh state
      await loadSlots();
    } catch {
      setMessage({ text: "Помилка мережі", ok: false });
    } finally {
      setSaving(false);
    }
  }

  const blockedCount = HOURS.filter((h) => slots[h]?.status === "blocked").length;

  // ── Range logic ──────────────────────────────────────────────────────────
  function toggleRangeSector(s: string) {
    setRangeSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleRangeHour(h: number) {
    setRangeHours((prev) => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h);
      else next.add(h);
      return next;
    });
  }

  async function saveRange() {
    setRangeSaving(true);
    setRangeMessage(null);
    const rangeSlots = Array.from(rangeHours)
      .sort((a, b) => a - b)
      .map((h) => ({ startTime: toTime(h), endTime: toTime(h + 1) }));
    try {
      const res = await fetch("/api/admin/blocked-slots/range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom: rangeFrom, dateTo: rangeTo, sectors: rangeSectors, slots: rangeSlots }),
      });
      const data = (await res.json()) as { added?: number; error?: string };
      if (!res.ok) {
        setRangeMessage({ text: data.error ?? "Помилка", ok: false });
      } else {
        setRangeMessage({ text: `Заблоковано нових слотів: ${data.added ?? 0}`, ok: true });
      }
    } catch {
      setRangeMessage({ text: "Помилка мережі", ok: false });
    } finally {
      setRangeSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex w-fit gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === "single" ? "bg-[#10243a] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Один день
        </button>
        <button
          type="button"
          onClick={() => setMode("range")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === "range" ? "bg-[#10243a] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Діапазон дат
        </button>
      </div>

      {mode === "single" && (<>
      {/* Controls */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Дата</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700"
              aria-label="Попередній місяць"
            >
              ←
            </button>
            <p className="text-sm font-semibold capitalize text-slate-800">{calendarMonthLabel}</p>
            <button
              type="button"
              onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-700"
              aria-label="Наступний місяць"
            >
              →
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((dayLabel) => (
              <span key={dayLabel}>{dayLabel}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {inlineCalendarDays.map((day) => {
              const isSelected = day.iso === date;

              return (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => {
                    setDate(day.iso);
                    if (!day.inCurrentMonth) {
                      const d = new Date(`${day.iso}T00:00:00`);
                      setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                    }
                  }}
                  className={`h-9 rounded-md text-sm font-semibold transition ${
                    isSelected
                      ? "bg-[#10243a] text-white"
                      : day.inCurrentMonth
                        ? "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-50/70 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">Обрано: {formatDateUk(date)}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Поле</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SECTORS.map((s) => {
              const active = sector === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSector(s)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[#10243a] bg-[#10243a] text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">Сектор</p>
                  <p className="text-sm font-bold">{s}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-slate-200" />
          Вільно
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-orange-400" />
          Заблоковано вами
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-emerald-500" />
          Сплачено клієнтом
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-blue-200" />
          Очікує оплати
        </span>
      </div>

      {/* Slot grid */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm font-semibold text-slate-700">
            {sector} · {formatDateUk(date)}
            {loading && <span className="ml-2 text-xs font-normal text-slate-400">завантаження…</span>}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Натисніть на слот щоб заблокувати / розблокувати. Збережений блок не дасть клієнту обрати цей час.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 p-4 sm:grid-cols-8">
          {HOURS.map((h) => {
            const info = slots[h] ?? { status: "free" };
            const isBooked = info.status === "booked";
            const isBlocked = info.status === "blocked";
            const isPaid =
              isBooked &&
              (info.booked?.paymentStatus === "paid" || info.booked?.paymentStatus === "verification");

            let bgClass =
              "bg-slate-50 ring-1 ring-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer";
            if (isBlocked) bgClass = "bg-orange-400 text-white ring-orange-400 cursor-pointer hover:bg-orange-500";
            if (isBooked && isPaid) bgClass = "bg-emerald-500 text-white ring-emerald-500 cursor-default opacity-80";
            if (isBooked && !isPaid) bgClass = "bg-blue-200 text-blue-800 ring-blue-200 cursor-default opacity-80";

            const bookingTitle =
              info.booked?.bookedBy && info.booked.bookedBy.trim().length > 0
                ? `Заброньовано: ${info.booked.bookedBy}`
                : "Слот зайнятий бронюванням";

            return (
              <button
                key={h}
                type="button"
                aria-disabled={isBooked}
                onClick={() => toggleHour(h)}
                className={`relative flex flex-col items-center justify-center rounded-xl px-2 py-3 text-center text-xs font-semibold ring-1 transition ${bgClass}`}
                title={
                  isBooked
                    ? bookingTitle
                    : isBlocked
                      ? info.blockedReason?.trim() || "Заблоковано — клікніть щоб розблокувати"
                      : "Вільно — клікніть щоб заблокувати"
                }
              >
                <span>{toTime(h)}</span>
                <span className="mt-0.5 text-[10px] font-normal opacity-70">— {toTime(h + 1)}</span>
                {isBlocked && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wide opacity-90">блок</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <p className="text-sm text-slate-500">
            {blockedCount > 0 ? (
              <span className="font-semibold text-orange-600">
                {blockedCount} слот{blockedCount === 1 ? "" : "и"} заблоковано
              </span>
            ) : (
              "Немає заблокованих слотів"
            )}
          </p>
          <div className="flex items-center gap-3">
            {message && (
              <p className={`text-xs font-medium ${message.ok ? "text-emerald-600" : "text-red-500"}`}>
                {message.text}
              </p>
            )}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || loading}
              className="rounded-xl bg-[#10243a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a5c] disabled:opacity-50"
            >
              {saving ? "Зберігання…" : "Зберегти"}
            </button>
          </div>
        </div>
      </div>
      </>)}

      {/* ── DATE RANGE ──────────────────────────────────────────────────── */}
      {mode === "range" && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-sm font-semibold text-slate-700">Масове блокування за діапазоном дат</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Оберіть діапазон, сектори та години — зазначені слоти будуть заблоковані на кожен день у діапазоні.
            </p>
          </div>

          <div className="space-y-6 p-6">
            {/* Date range */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">З дати</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-500">По дату</label>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            {/* Sectors */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-500">Сектори</label>
              <div className="flex flex-wrap gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleRangeSector(s)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-semibold ring-1 transition ${
                      rangeSectors.includes(s)
                        ? "bg-[#10243a] text-white ring-[#10243a]"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Hours */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-500">Години для блокування</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRangeHours(new Set(HOURS))}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Всі
                  </button>
                  <span className="text-xs text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => setRangeHours(new Set())}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    Очистити
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {HOURS.map((h) => {
                  const selected = rangeHours.has(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => toggleRangeHour(h)}
                      className={`flex flex-col items-center justify-center rounded-xl px-2 py-3 text-center text-xs font-semibold ring-1 transition ${
                        selected
                          ? "bg-orange-400 text-white ring-orange-400 hover:bg-orange-500"
                          : "bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{toTime(h)}</span>
                      <span className="mt-0.5 text-[10px] font-normal opacity-70">— {toTime(h + 1)}</span>
                      {selected && (
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-wide opacity-90">блок</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-sm text-slate-500">
              {rangeHours.size > 0 ? (
                <span className="font-semibold text-orange-600">
                  {rangeHours.size} год · {rangeSectors.length} сект.
                </span>
              ) : (
                "Оберіть хоча б одну годину"
              )}
            </p>
            <div className="flex items-center gap-3">
              {rangeMessage && (
                <p className={`text-xs font-medium ${rangeMessage.ok ? "text-emerald-600" : "text-red-500"}`}>
                  {rangeMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={() => void saveRange()}
                disabled={rangeSaving || rangeHours.size === 0 || rangeSectors.length === 0}
                className="rounded-xl bg-[#10243a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1a3a5c] disabled:opacity-50"
              >
                {rangeSaving ? "Блокування…" : "Заблокувати"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
