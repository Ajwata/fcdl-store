"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AdminRole } from "@/lib/admin-users";
import type { Booking } from "@/lib/bookings";
import { formatDateTimeUk, formatDateUk } from "@/lib/date-format";

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

const paymentMethodLabels: Record<string, string> = {
  cash: "Готівка",
  iban: "IBAN",
};

type SortKey = "id" | "clientName" | "createdAt" | "eventDateTime" | "sector" | "totalPrice" | "status" | "paymentStatus";
type SortDirection = "asc" | "desc";

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

function cleanSystemNotes(note: string): string {
  const removed = new Set(["Створено з календаря клієнтом", "Створено з календаря клієнта"]);
  return note
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !removed.has(line))
    .join("\n");
}

function formatRemainingTime(targetIso?: string, nowMs?: number): string | null {
  if (!targetIso || !nowMs) return null;
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return null;

  const diff = targetMs - nowMs;
  if (diff <= 0) return "Час вичерпано";

  const totalMinutes = Math.floor(diff / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} д ${hours} год`;
  }
  if (hours > 0) {
    return `${hours} год ${minutes} хв`;
  }
  return `${minutes} хв`;
}

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<AdminRole | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("eventDateTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [actionError, setActionError] = useState("");

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const statusFilter = searchParams.get("status") ?? "all";
  const bookingIdFilter = searchParams.get("bookingId")?.trim() ?? "";
  const [search, setSearch] = useState(bookingIdFilter);

  useEffect(() => {
    setSearch(bookingIdFilter);
  }, [bookingIdFilter]);

  useEffect(() => {
    let cancelled = false;
    const loadRole = async () => {
      try {
        const res = await fetch("/api/admin/referrals", { cache: "no-store" });
        const data = (await res.json()) as { role?: AdminRole };
        if (!cancelled) setRole(data.role ?? null);
      } catch {
        if (!cancelled) setRole(null);
      }
    };
    void loadRole();
    return () => { cancelled = true; };
  }, []);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const updateBooking = async (
    id: string,
    updates: Partial<Pick<Booking, "status" | "paymentStatus">>,
    options?: { cancelReason?: string },
  ) => {
    setSaving(id);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, ...(options?.cancelReason ? { cancelReason: options.cancelReason } : {}) }),
      });

      const data = (await res.json()) as { error?: string; booking?: Booking };
      if (!res.ok || !data.booking) {
        setActionError(data.error ?? "Не вдалося оновити бронювання");
        return false;
      }

      setBookings((prev) => prev.map((b) => (b.id === id ? data.booking! : b)));
      return true;
    } catch {
      setActionError("Помилка мережі. Спробуйте ще раз.");
      return false;
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
    );

  const sorted = useMemo(() => {
    const list = [...filtered];

    list.sort((a, b) => {
      let result = 0;
      if (sortKey === "id") {
        result = a.id.localeCompare(b.id, "uk");
      } else if (sortKey === "clientName") {
        result = a.clientName.localeCompare(b.clientName, "uk");
      } else if (sortKey === "createdAt") {
        result = a.createdAt.localeCompare(b.createdAt);
      } else if (sortKey === "eventDateTime") {
        result = `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`);
      } else if (sortKey === "sector") {
        result = a.sector.localeCompare(b.sector, "uk");
      } else if (sortKey === "totalPrice") {
        result = a.totalPrice - b.totalPrice;
      } else if (sortKey === "status") {
        result = (statusLabels[a.status] ?? a.status).localeCompare(statusLabels[b.status] ?? b.status, "uk");
      } else if (sortKey === "paymentStatus") {
        result = (paymentLabels[a.paymentStatus] ?? a.paymentStatus).localeCompare(
          paymentLabels[b.paymentStatus] ?? b.paymentStatus,
          "uk",
        );
      }

      if (result === 0) {
        return `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`);
      }
      return sortDirection === "asc" ? result : -result;
    });

    return list;
  }, [filtered, sortDirection, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "createdAt" || key === "eventDateTime" || key === "totalPrice" ? "desc" : "asc");
  };

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedUnreadCount = bookings.filter(
    (b) => b.status === "confirmed" && b.paymentStatus === "verification",
  ).length;
  const nonCancelledCount = bookings.filter((b) => b.status !== "cancelled").length;
  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled" && b.paymentStatus === "paid")
    .reduce((s, b) => s + b.totalPrice, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Бронювання</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {nonCancelledCount} активних записів · ₴ {totalRevenue.toLocaleString("uk-UA")} оплачено
        </p>
      </div>

      {actionError && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">
          {actionError}
        </p>
      )}

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

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Завантаження...</div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">Бронювань не знайдено</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("id")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      ID{sortIndicator("id")}
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button type="button" onClick={() => toggleSort("clientName")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Клієнт{sortIndicator("clientName")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("createdAt")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Дата / Час бронювання{sortIndicator("createdAt")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("eventDateTime")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Дата / Час події{sortIndicator("eventDateTime")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("sector")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Поле{sortIndicator("sector")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("totalPrice")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Сума{sortIndicator("totalPrice")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("status")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Статус{sortIndicator("status")}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("paymentStatus")} className="font-semibold uppercase tracking-wide hover:text-slate-600">
                      Оплата{sortIndicator("paymentStatus")}
                    </button>
                  </th>
                  <th className="px-4 py-3">Дії</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => {
                  const visibleNotes = cleanSystemNotes(b.notes ?? "");
                  const pendingDeadline = b.status === "pending" ? b.adminDecisionDueAt : undefined;
                  const paymentDeadline = b.status === "confirmed" && b.paymentStatus === "unpaid" ? b.paymentDueAt : undefined;
                  const activeDeadline = pendingDeadline ?? paymentDeadline;
                  const deadlineLabel = pendingDeadline ? "До рішення" : paymentDeadline ? "До оплати" : "";
                  const remaining = formatRemainingTime(activeDeadline, nowMs);

                  return (
                    <tr
                      key={b.id}
                      className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-xs font-mono text-slate-700">{b.id}</td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{b.clientName}</p>
                        <p className="text-xs text-slate-400">{b.clientPhone}</p>
                        {b.clientEmail && (
                          <p className="text-xs text-slate-400">{b.clientEmail}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDateTimeUk(b.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="text-slate-700">{formatDateUk(b.date)}</p>
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
                        {visibleNotes && (
                          <p className="mt-1 max-w-[280px] whitespace-pre-line text-xs text-slate-500" title={visibleNotes}>
                            {visibleNotes}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className={`text-xs font-semibold ${paymentColors[b.paymentStatus] ?? "text-slate-600"}`}>
                          {paymentLabels[b.paymentStatus] ?? b.paymentStatus}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-500">
                          Спосіб: {paymentMethodLabels[b.paymentMethod ?? "cash"] ?? "Готівка"}
                        </p>
                        {activeDeadline && (
                          <div className="mt-1 space-y-0.5">
                            <p className="text-[10px] font-semibold text-slate-500">
                              {deadlineLabel}: {formatDateTimeUk(activeDeadline)}
                            </p>
                            {remaining && (
                              <p className={`text-[10px] font-semibold ${remaining === "Час вичерпано" ? "text-rose-600" : "text-amber-700"}`}>
                                Залишилось: {remaining}
                              </p>
                            )}
                          </div>
                        )}
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
                              <p className="text-[10px] text-slate-400">{formatDateTimeUk(b.paymentProofUploadedAt)}</p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {b.status === "pending" && role === "superadmin" && (
                            <button
                              disabled={saving === b.id}
                              onClick={() => void updateBooking(b.id, { status: "confirmed" })}
                              className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 transition hover:bg-blue-100 disabled:opacity-50"
                            >
                              Підтвердити
                            </button>
                          )}
                          {b.paymentStatus === "verification" && b.paymentProofUrl && b.status !== "cancelled" && b.status !== "completed" && (
                            <button
                              disabled={saving === b.id}
                              onClick={() => void updateBooking(b.id, { paymentStatus: "paid" })}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Підтвердити оплату
                            </button>
                          )}
                          {b.status !== "completed" && (
                            <button
                              disabled={saving === b.id || b.status === "cancelled"}
                              onClick={() => {
                                setCancelTarget(b);
                                setCancelReason("");
                                setCancelError("");
                              }}
                              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-100 disabled:opacity-50"
                            >
                              Скасувати
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-800">Скасування бронювання</h2>
            <p className="mt-1 text-sm text-slate-500">
              Вкажіть причину для {cancelTarget.id}. Після збереження причина буде доступна тільки для перегляду.
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--green-700)]"
              placeholder="Причина скасування"
            />

            {cancelError && (
              <p className="mt-2 text-sm font-semibold text-rose-700">{cancelError}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                  setCancelError("");
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600"
              >
                Закрити
              </button>
              <button
                type="button"
                disabled={saving === cancelTarget.id}
                onClick={async () => {
                  const reason = cancelReason.trim();
                  if (!reason) {
                    setCancelError("Вкажіть причину скасування");
                    return;
                  }
                  setSaving(cancelTarget.id);
                  setCancelError("");
                  try {
                    const res = await fetch(`/api/admin/bookings/${cancelTarget.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
                    });

                    const data = (await res.json()) as { error?: string; booking?: Booking };
                    
                    if (!res.ok) {
                      setCancelError(data.error ?? `Помилка сервера (${res.status})`);
                      setSaving(null);
                      return;
                    }

                    if (!data.booking) {
                      setCancelError("Бронювання не повернено сервером");
                      setSaving(null);
                      return;
                    }

                    setBookings((prev) => prev.map((b) => (b.id === cancelTarget.id ? data.booking! : b)));
                    setCancelTarget(null);
                    setCancelReason("");
                    setCancelError("");
                  } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Невідома помилка";
                    setCancelError(`Помилка мережі: ${errorMsg}`);
                  } finally {
                    setSaving(null);
                  }
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
