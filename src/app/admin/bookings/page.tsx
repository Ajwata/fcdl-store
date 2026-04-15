"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { Booking, BookingStatus, PaymentStatus } from "@/lib/bookings";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 ring-amber-200",
  confirmed: "bg-blue-100 text-blue-700 ring-blue-200",
  completed: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  cancelled: "bg-red-100 text-red-600 ring-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  completed: "Завершено",
  cancelled: "Скасовано",
};

const paymentColors: Record<string, string> = {
  unpaid: "text-amber-700",
  verification: "text-amber-700",
  paid: "text-emerald-600",
  refunded: "text-slate-400",
};

const paymentLabels: Record<string, string> = {
  unpaid: "Не оплачено",
  verification: "Перевірка оплати",
  paid: "Оплачено",
  refunded: "Повернено",
};

const statusFilterOptions: Array<{ value: string; label: string }> = [
  { value: "all", label: "Всі статуси" },
  { value: "pending", label: "Очікують" },
  { value: "confirmed", label: "Підтверджені" },
  { value: "completed", label: "Завершені" },
  { value: "cancelled", label: "Скасовані" },
];

function normalizeReceiptUrl(url?: string): string {
  if (!url) return "";
  const uploadsMatch = url.match(/(?:^|\/)uploads\/receipts\/([^/?#]+)$/i);
  if (uploadsMatch) {
    return `/api/account/receipt?file=${encodeURIComponent(uploadsMatch[1])}`;
  }
  return url;
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const statusFilter = searchParams.get("status") ?? "all";
  const bookingIdFilter = searchParams.get("bookingId")?.trim() ?? "";
  const [search, setSearch] = useState(bookingIdFilter);

  useEffect(() => {
    setSearch(bookingIdFilter);
  }, [bookingIdFilter]);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bookings");
      const data = (await res.json()) as { bookings: Booking[] };
      setBookings(data.bookings ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchBookings();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchBookings]);

  const updateBooking = async (
    id: string,
    updates: Partial<Pick<Booking, "status" | "paymentStatus">>,
  ) => {
    setSaving(id);
    try {
      await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    } finally {
      setSaving(null);
    }
  };

  const filtered = bookings
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter(
      (b) =>
        !search ||
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        b.clientName.toLowerCase().includes(search.toLowerCase()) ||
        b.clientPhone.includes(search) ||
        b.clientEmail.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedUnreadCount = bookings.filter(
    (b) => b.status === "confirmed" && b.paymentStatus === "verification",
  ).length;
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.totalPrice, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Бронювання</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {bookings.length} записів · ₴ {totalRevenue.toLocaleString("uk-UA")} оплачено
        </p>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Пошук за ID, іменем або телефоном..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
        />
        <div className="flex gap-1.5">
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (opt.value === "all") {
                  params.delete("status");
                } else {
                  params.set("status", opt.value);
                }
                router.replace(`/admin/bookings?${params.toString()}`);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === opt.value || (opt.value === "all" && statusFilter === "all")
                  ? "bg-[var(--green-700)] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
              {opt.value === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              {opt.value === "confirmed" && confirmedUnreadCount > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {confirmedUnreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Завантаження...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Бронювань не знайдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">Клієнт</th>
                  <th className="px-4 py-3">Дата / Час</th>
                  <th className="px-4 py-3">Поле</th>
                  <th className="px-4 py-3">Сума</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Оплата</th>
                  <th className="px-4 py-3">Дії</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{b.clientName}</p>
                      <p className="text-xs text-slate-400">{b.clientPhone}</p>
                      {b.clientEmail && (
                        <p className="text-xs text-slate-400">{b.clientEmail}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="text-slate-700">{b.date}</p>
                      <p className="text-xs text-slate-400">
                        {b.startTime}–{b.endTime} ({b.durationHours}г)
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">Поле {b.sector}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        ₴ {b.totalPrice.toLocaleString("uk-UA")}
                      </p>
                      <p className="text-xs text-slate-400">
                        ₴ {b.pricePerHour}/год
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusColors[b.status] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}
                      >
                        {statusLabels[b.status] ?? b.status}
                      </span>
                      {b.notes && (
                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400" title={b.notes}>
                          {b.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={b.paymentStatus}
                        disabled={saving === b.id}
                        onChange={(e) =>
                          updateBooking(b.id, {
                            paymentStatus: e.target.value as PaymentStatus,
                          })
                        }
                        className={`rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium outline-none transition focus:ring-1 focus:ring-[var(--green-700)] ${paymentColors[b.paymentStatus] ?? ""}`}
                      >
                        <option value="unpaid">Не оплачено</option>
                        <option value="verification">Перевірка оплати</option>
                        <option value="paid">Оплачено</option>
                        <option value="refunded">Повернено</option>
                      </select>
                      {b.paymentProofUrl && (
                        <div className="mt-1 space-y-1">
                          <a
                            href={normalizeReceiptUrl(b.paymentProofUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs font-semibold text-[var(--blue-800)] underline"
                          >
                            Квитанція від клієнта
                          </a>
                          {b.paymentProofUploadedAt && (
                            <p className="text-[10px] text-slate-400">{new Date(b.paymentProofUploadedAt).toLocaleString("uk-UA")}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {b.status === "pending" && (
                          <button
                            disabled={saving === b.id}
                            onClick={() =>
                              updateBooking(b.id, { status: "confirmed" as BookingStatus })
                            }
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition hover:bg-blue-100 disabled:opacity-50"
                          >
                            Підтвердити
                          </button>
                        )}
                        {b.status !== "cancelled" && (
                          <button
                            disabled={saving === b.id}
                            onClick={() =>
                              updateBooking(b.id, { status: "cancelled" as BookingStatus })
                            }
                            className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Скасувати
                          </button>
                        )}
                        {b.status !== "cancelled" && (b.paymentStatus === "paid" || b.paymentStatus === "verification") && (
                          <button
                            disabled={saving === b.id}
                            onClick={() =>
                              updateBooking(b.id, {
                                status: "cancelled" as BookingStatus,
                                paymentStatus: "refunded" as PaymentStatus,
                              })
                            }
                            className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-100 disabled:opacity-50"
                          >
                            Повернення
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
