"use client";

import { useMemo, useState } from "react";

type ClientSummary = {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  sectors: string[];
};

type DiscountRow = {
  clientPhone: string;
  clientPhoneKey: string;
  discountPercent: number;
  updatedAt: string;
  updatedById?: string;
};

type Props = {
  clients: ClientSummary[];
  initialDiscounts: DiscountRow[];
};

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function ClientDiscountsManager({ clients, initialDiscounts }: Props) {
  const [discounts, setDiscounts] = useState<DiscountRow[]>(initialDiscounts);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingPhoneKey, setSavingPhoneKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const discountsByPhone = useMemo(
    () => new Map(discounts.map((item) => [item.clientPhoneKey, item])),
    [discounts],
  );

  const saveDiscount = async (client: ClientSummary) => {
    const key = phoneKey(client.phone);
    const draft = drafts[key] ?? String(discountsByPhone.get(key)?.discountPercent ?? 0);
    const numeric = Number(draft);

    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 90) {
      setStatus(`Некоректна знижка для ${client.name}. Допустимо 0-90%.`);
      return;
    }

    setSavingPhoneKey(key);
    setStatus("");
    try {
      const response = await fetch("/api/admin/client-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientPhone: client.phone, discountPercent: numeric }),
      });
      const result = (await response.json()) as { error?: string; discount?: DiscountRow };
      if (!response.ok || !result.discount) {
        setStatus(result.error ?? "Не вдалося зберегти знижку");
        return;
      }

      if (numeric === 0) {
        setDiscounts((prev) => prev.filter((item) => item.clientPhoneKey !== key));
      } else {
        setDiscounts((prev) => {
          const next = prev.filter((item) => item.clientPhoneKey !== key);
          next.push(result.discount!);
          return next;
        });
      }

      setStatus(`Знижку для ${client.name} збережено`);
    } catch {
      setStatus("Помилка мережі");
    } finally {
      setSavingPhoneKey(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-800">Індивідуальні знижки клієнтів</h2>
        <p className="mt-1 text-sm text-slate-500">Налаштовуйте персональну знижку в %, яка автоматично застосовується під час бронювання.</p>
      </div>

      {status && <p className="px-6 py-3 text-sm font-semibold text-slate-700">{status}</p>}

      {clients.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Немає клієнтів для налаштування знижок</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3">Клієнт</th>
                <th className="px-4 py-3">Телефон</th>
                <th className="px-4 py-3">Поточна знижка</th>
                <th className="px-4 py-3">Встановити</th>
                <th className="px-4 py-3">Дія</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const key = phoneKey(client.phone);
                const currentDiscount = discountsByPhone.get(key)?.discountPercent ?? 0;
                const draft = drafts[key] ?? String(currentDiscount);

                return (
                  <tr key={client.phone} className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{client.name}</p>
                      {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{client.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${currentDiscount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {currentDiscount > 0 ? `${currentDiscount}%` : "Немає"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[140px] items-center rounded-xl border border-slate-200 bg-white px-2">
                        <input
                          value={draft}
                          onChange={(event) => {
                            if (/^\d{0,2}$/.test(event.target.value)) {
                              setDrafts((prev) => ({ ...prev, [key]: event.target.value }));
                            }
                          }}
                          className="w-full bg-transparent px-1 py-2 text-sm text-slate-800 outline-none"
                        />
                        <span className="text-xs text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          void saveDiscount(client);
                        }}
                        disabled={savingPhoneKey === key}
                        className="rounded-lg bg-[var(--green-700)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
                      >
                        {savingPhoneKey === key ? "..." : "Зберегти"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
