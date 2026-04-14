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
  registeredAt: string | null;
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

export function ClientsTable({ clients, initialDiscounts }: Props) {
  const [discounts, setDiscounts] = useState<DiscountRow[]>(initialDiscounts);
  const [modalClient, setModalClient] = useState<ClientSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalStatus, setModalStatus] = useState("");

  const discountsByKey = useMemo(
    () => new Map(discounts.map((d) => [d.clientPhoneKey, d])),
    [discounts],
  );

  function openModal(client: ClientSummary) {
    const current = discountsByKey.get(phoneKey(client.phone))?.discountPercent ?? 0;
    setDraft(String(current));
    setModalStatus("");
    setModalClient(client);
  }

  function closeModal() {
    setModalClient(null);
  }

  async function saveDiscount() {
    if (!modalClient) return;
    const numeric = Number(draft);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 90) {
      setModalStatus("Допустимо від 0 до 90%");
      return;
    }
    setSaving(true);
    setModalStatus("");
    try {
      const res = await fetch("/api/admin/client-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientPhone: modalClient.phone, discountPercent: numeric }),
      });
      const result = (await res.json()) as { error?: string; discount?: DiscountRow };
      if (!res.ok || !result.discount) {
        setModalStatus(result.error ?? "Помилка збереження");
        return;
      }
      const key = phoneKey(modalClient.phone);
      if (numeric === 0) {
        setDiscounts((prev) => prev.filter((d) => d.clientPhoneKey !== key));
      } else {
        setDiscounts((prev) => {
          const next = prev.filter((d) => d.clientPhoneKey !== key);
          next.push(result.discount!);
          return next;
        });
      }
      closeModal();
    } catch {
      setModalStatus("Помилка мережі");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {clients.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Немає клієнтів</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">Клієнт</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Бронювань</th>
                  <th className="px-4 py-3">Витрачено</th>
                  <th className="px-4 py-3">Поля</th>
                  <th className="px-4 py-3">Останнє</th>
                  <th className="px-4 py-3">Знижка</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const key = phoneKey(client.phone);
                  const discount = discountsByKey.get(key)?.discountPercent ?? 0;
                  return (
                    <tr
                      key={client.phone}
                      className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ background: `hsl(${(client.name.charCodeAt(0) * 27) % 360}, 55%, 45%)` }}
                          >
                            {client.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join("")}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-slate-800">{client.name}</p>
                              {client.registeredAt && (
                                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                  акаунт
                                </span>
                              )}
                            </div>
                            {client.email && (
                              <p className="text-xs text-slate-400">{client.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{client.phone}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{client.totalBookings}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-600">
                          ₴ {client.totalSpent.toLocaleString("uk-UA")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {client.sectors.sort().map((s) => (
                            <span
                              key={s}
                              className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {client.lastBookingDate || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openModal(client)}
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-75 ${
                            discount > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {discount > 0 ? `${discount}%` : "+ знижка"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Discount modal */}
      {modalClient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {/* Header */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Індивідуальна знижка</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {modalClient.name} · {modalClient.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Input */}
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              Знижка в % &nbsp;<span className="font-normal text-slate-400">(0 — скасувати знижку)</span>
            </label>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
              <input
                type="number"
                min={0}
                max={90}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveDiscount();
                  if (e.key === "Escape") closeModal();
                }}
                className="w-full bg-transparent text-2xl font-bold text-slate-800 outline-none"
                autoFocus
              />
              <span className="text-lg font-medium text-slate-400">%</span>
            </div>

            {modalStatus && (
              <p className="mt-2 text-xs font-medium text-red-500">{modalStatus}</p>
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => void saveDiscount()}
                disabled={saving}
                className="flex-1 rounded-xl bg-[var(--green-700)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
              >
                {saving ? "Збереження…" : "Зберегти"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
