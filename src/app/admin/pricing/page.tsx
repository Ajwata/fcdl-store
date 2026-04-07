"use client";

import { useEffect, useState } from "react";

import type { PricingConfig } from "@/lib/pricing";

const SECTORS = ["№1", "№2", "№3", "№4"] as const;
const SECTOR_LABELS: Record<string, string> = {
  "№1": "Поле №1 (20×40 м)",
  "№2": "Поле №2 (17×40 м)",
  "№3": "Поле №3 (20×40 м)",
  "№4": "Поле №4 — полное (40×60 м)",
};

type SectorDraft = { dayPrice: string; eveningPrice: string };

export default function AdminPricingPage() {
  const [eveningStartHour, setEveningStartHour] = useState<number>(18);
  const [sectors, setSectors] = useState<Record<string, SectorDraft>>({
    "№1": { dayPrice: "900", eveningPrice: "1100" },
    "№2": { dayPrice: "800", eveningPrice: "1000" },
    "№3": { dayPrice: "900", eveningPrice: "1100" },
    "№4": { dayPrice: "2500", eveningPrice: "3000" },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/pricing");
        if (res.ok) {
          const data = (await res.json()) as PricingConfig;
          setEveningStartHour(data.eveningStartHour);
          setSectors(
            Object.fromEntries(
              SECTORS.map((s) => [
                s,
                {
                  dayPrice: String(data.sectors[s]?.dayPrice ?? ""),
                  eveningPrice: String(data.sectors[s]?.eveningPrice ?? ""),
                },
              ]),
            ),
          );
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSectorChange = (sector: string, field: "dayPrice" | "eveningPrice", value: string) => {
    if (/^\d*$/.test(value)) {
      setSectors((prev) => ({ ...prev, [sector]: { ...prev[sector], [field]: value } }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError("");

    const sectorPayload: PricingConfig["sectors"] = {};
    for (const s of SECTORS) {
      const day = parseInt(sectors[s]?.dayPrice ?? "0", 10);
      const eve = parseInt(sectors[s]?.eveningPrice ?? "0", 10);
      if (isNaN(day) || isNaN(eve) || day < 0 || eve < 0) {
        setError(`Некоректна ціна для поля ${s}`);
        setSaving(false);
        return;
      }
      sectorPayload[s] = { dayPrice: day, eveningPrice: eve };
    }

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eveningStartHour, sectors: sectorPayload }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Помилка збереження");
      }
    } catch {
      setError("Помилка мережі");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-slate-500">Завантаження...</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--blue-950)]">Управління цінами</h1>
        <p className="mt-1 text-sm text-slate-500">
          Встановіть денну та вечірню ціну для кожного поля. Зміни відразу відображаються на сайті.
        </p>
      </div>

      {/* Evening hour setting */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-[var(--blue-950)]">Поріг вечірнього часу</h2>
        <p className="mb-4 text-sm text-slate-500">
          Починаючи з цієї години застосовується вечірній тариф. До неї — денний.
        </p>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Вечірній тариф з:</label>
          <select
            value={eveningStartHour}
            onChange={(e) => setEveningStartHour(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
          >
            {Array.from({ length: 19 }, (_, i) => i + 6).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <span className="text-sm text-slate-400">
            Денний: 06:00 – {String(eveningStartHour).padStart(2, "0")}:00 &nbsp;|&nbsp; Вечірній: {String(eveningStartHour).padStart(2, "0")}:00 – 22:00
          </span>
        </div>
      </div>

      {/* Sector prices */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SECTORS.map((sector) => (
          <div key={sector} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green-700)] text-sm font-bold text-white">
                {sector}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--blue-950)]">{SECTOR_LABELS[sector]}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Day price */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Денна (грн/год)
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[var(--green-700)]">
                  <span className="px-3 text-sm text-slate-400">₴</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sectors[sector]?.dayPrice ?? ""}
                    onChange={(e) => handleSectorChange(sector, "dayPrice", e.target.value)}
                    className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-semibold text-[var(--blue-950)] focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  06:00 – {String(eveningStartHour).padStart(2, "0")}:00
                </p>
              </div>

              {/* Evening price */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Вечірня (грн/год)
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-within:border-[var(--green-700)]">
                  <span className="px-3 text-sm text-slate-400">₴</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={sectors[sector]?.eveningPrice ?? ""}
                    onChange={(e) => handleSectorChange(sector, "eveningPrice", e.target.value)}
                    className="flex-1 bg-transparent py-2.5 pr-3 text-sm font-semibold text-[var(--blue-950)] focus:outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  {String(eveningStartHour).padStart(2, "0")}:00 – 22:00
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div className="mt-6 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[var(--green-700)] px-6 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Збереження..." : "Зберегти ціни"}
        </button>

        {saved && (
          <p className="text-sm font-semibold text-emerald-600">✓ Ціни збережено</p>
        )}
        {error && (
          <p className="text-sm font-semibold text-red-500">{error}</p>
        )}
      </div>
    </main>
  );
}
