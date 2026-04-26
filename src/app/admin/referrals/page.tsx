"use client";

import { useEffect, useMemo, useState } from "react";

import { formatDateTimeUk, formatDateUk } from "@/lib/date-format";

type Manager = {
  id: string;
  login: string;
  name: string;
  role: "manager";
};

type ReferralAssignment = {
  clientPhone: string;
  clientPhoneKey: string;
  managerId: string;
  managerLogin: string;
  managerName: string;
  assignedAt: string;
  assignedById?: string;
};

type ManagerReferralStats = {
  managerId: string;
  managerLogin: string;
  managerName: string;
  referredClients: number;
  clientsWithDeals: number;
  dealsCount: number;
  commissionTotal: number;
};

type ReferralDeal = {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  managerId: string;
  managerLogin: string;
  managerName: string;
  date: string;
  totalPrice: number;
  commission: number;
};

type ResponseShape = {
  role: "superadmin" | "manager";
  managers: Manager[];
  assignments: ReferralAssignment[];
  report: {
    managerStats: ManagerReferralStats[];
    deals: ReferralDeal[];
    totals: {
      referredClients: number;
      clientsWithDeals: number;
      dealsCount: number;
      commissionTotal: number;
    };
  };
};

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ResponseShape | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [dealsQuery, setDealsQuery] = useState("");
  const [selectedDealsManager, setSelectedDealsManager] = useState<string>("all");
  const [dealsPage, setDealsPage] = useState(1);
  const [assignmentsQuery, setAssignmentsQuery] = useState("");
  const [selectedAssignmentsManager, setSelectedAssignmentsManager] = useState<string>("all");
  const [assignmentsPage, setAssignmentsPage] = useState(1);

  const pageSize = 25;

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/referrals", { cache: "no-store" });
      const result = (await res.json()) as ResponseShape & { error?: string };
      if (!res.ok) {
        setError(result.error ?? "Не вдалося завантажити реферальні дані");
        return;
      }
      setData(result);
    } catch {
      setError("Помилка мережі");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => data?.report.managerStats ?? [], [data]);
  const deals = useMemo(() => data?.report.deals ?? [], [data]);
  const assignments = useMemo(() => data?.assignments ?? [], [data]);

  const monthlyStats = useMemo(() => {
    const map = new Map<string, {
      monthKey: string;
      monthSort: string;
      managerId: string;
      managerName: string;
      dealsCount: number;
      commissionTotal: number;
    }>();

    for (const deal of deals) {
      const year = /^\d{4}-\d{2}-\d{2}$/.test(deal.date) ? deal.date.slice(0, 4) : "0000";
      const month = /^\d{4}-\d{2}-\d{2}$/.test(deal.date) ? deal.date.slice(5, 7) : "00";
      const monthKey = `${month}.${year}`;
      const monthSort = `${year}-${month}`;
      const key = `${deal.managerId}|${monthSort}`;

      if (!map.has(key)) {
        map.set(key, {
          monthKey,
          monthSort,
          managerId: deal.managerId,
          managerName: deal.managerName,
          dealsCount: 0,
          commissionTotal: 0,
        });
      }

      const row = map.get(key)!;
      row.dealsCount += 1;
      row.commissionTotal += deal.commission;
    }

    return Array.from(map.values()).sort((a, b) => {
      const byMonth = b.monthSort.localeCompare(a.monthSort);
      if (byMonth !== 0) return byMonth;
      return b.commissionTotal - a.commissionTotal;
    });
  }, [deals]);

  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ value: string; label: string }> = [];
    for (const item of monthlyStats) {
      if (seen.has(item.monthSort)) continue;
      seen.add(item.monthSort);
      options.push({ value: item.monthSort, label: item.monthKey });
    }
    return options;
  }, [monthlyStats]);

  const managerOptions = useMemo(() => data?.managers ?? [], [data]);

  const filteredMonthlyStats = useMemo(() => {
    if (selectedMonth === "all") return monthlyStats;
    return monthlyStats.filter((item) => item.monthSort === selectedMonth);
  }, [monthlyStats, selectedMonth]);

  const filteredDeals = useMemo(() => {
    const query = dealsQuery.trim().toLowerCase();
    return deals.filter((deal) => {
      if (selectedDealsManager !== "all" && deal.managerId !== selectedDealsManager) {
        return false;
      }
      if (!query) return true;
      return (
        deal.bookingId.toLowerCase().includes(query) ||
        deal.clientName.toLowerCase().includes(query) ||
        deal.clientPhone.toLowerCase().includes(query) ||
        deal.managerName.toLowerCase().includes(query)
      );
    });
  }, [deals, dealsQuery, selectedDealsManager]);

  const filteredAssignments = useMemo(() => {
    const query = assignmentsQuery.trim().toLowerCase();
    return assignments.filter((item) => {
      if (selectedAssignmentsManager !== "all" && item.managerId !== selectedAssignmentsManager) {
        return false;
      }
      if (!query) return true;
      return (
        item.clientPhone.toLowerCase().includes(query) ||
        item.managerName.toLowerCase().includes(query) ||
        item.managerLogin.toLowerCase().includes(query)
      );
    });
  }, [assignments, assignmentsQuery, selectedAssignmentsManager]);

  const dealsPageCount = Math.max(1, Math.ceil(filteredDeals.length / pageSize));
  const assignmentsPageCount = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));

  const visibleDeals = useMemo(() => {
    const start = (dealsPage - 1) * pageSize;
    return filteredDeals.slice(start, start + pageSize);
  }, [dealsPage, filteredDeals]);

  const visibleAssignments = useMemo(() => {
    const start = (assignmentsPage - 1) * pageSize;
    return filteredAssignments.slice(start, start + pageSize);
  }, [assignmentsPage, filteredAssignments]);

  useEffect(() => {
    setDealsPage(1);
  }, [dealsQuery, selectedDealsManager]);

  useEffect(() => {
    setAssignmentsPage(1);
  }, [assignmentsQuery, selectedAssignmentsManager]);

  useEffect(() => {
    if (dealsPage > dealsPageCount) {
      setDealsPage(dealsPageCount);
    }
  }, [dealsPage, dealsPageCount]);

  useEffect(() => {
    if (assignmentsPage > assignmentsPageCount) {
      setAssignmentsPage(assignmentsPageCount);
    }
  }, [assignmentsPage, assignmentsPageCount]);

  const exportMonthlyCsv = () => {
    const rows = [
      ["Місяць", "Менеджер", "Угод", "Заробив"],
      ...filteredMonthlyStats.map((item) => [
        item.monthKey,
        item.managerName,
        String(item.dealsCount),
        String(item.commissionTotal),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const monthLabel = selectedMonth === "all"
      ? "all"
      : selectedMonth;
    link.href = url;
    link.download = `referral-monthly-${monthLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <p className="text-sm text-slate-500">Завантаження реферальної статистики...</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex-1 p-6 lg:p-8">
        <p className="text-sm font-semibold text-rose-600">{error || "Невідома помилка"}</p>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Реферальна система менеджерів</h1>
        <p className="mt-1 text-sm text-slate-500">
          Комісія 5% нараховується тільки для завершених та оплачених бронювань рефералів.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Рефералів</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.report.totals.referredClients}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Клієнтів з угодами</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.report.totals.clientsWithDeals}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Оплачених завершених ігор</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{data.report.totals.dealsCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Нараховано менеджерам</p>
          <p className="mt-1 text-3xl font-black text-emerald-700">₴ {data.report.totals.commissionTotal.toLocaleString("uk-UA")}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
        <h2 className="text-lg font-semibold text-slate-800">Прив'язка клієнтів</h2>
        <p className="text-sm text-slate-600">
          Ручна прив'язка менеджером вимкнена. Клієнт сам обирає, хто його привів, під час оформлення бронювання.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Заробіток по менеджерах</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">Поки немає даних.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Менеджер</th>
                  <th className="px-3 py-2">Привів клієнтів</th>
                  <th className="px-3 py-2">Клієнтів з оплатою</th>
                  <th className="px-3 py-2">Угод</th>
                  <th className="px-3 py-2">Заробив</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((item) => (
                  <tr key={item.managerId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{item.managerName}</p>
                      <p className="text-xs text-slate-500">{item.managerLogin}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.referredClients}</td>
                    <td className="px-3 py-2 text-slate-700">{item.clientsWithDeals}</td>
                    <td className="px-3 py-2 text-slate-700">{item.dealsCount}</td>
                    <td className="px-3 py-2 font-bold text-emerald-700">₴ {item.commissionTotal.toLocaleString("uk-UA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Заробіток по місяцях</h2>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
            >
              <option value="all">Усі місяці</option>
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportMonthlyCsv}
              disabled={filteredMonthlyStats.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Експорт CSV
            </button>
          </div>
        </div>
        {monthlyStats.length === 0 ? (
          <p className="text-sm text-slate-500">Ще немає завершених оплачених реферальних угод.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Місяць</th>
                  <th className="px-3 py-2">Менеджер</th>
                  <th className="px-3 py-2">Угод</th>
                  <th className="px-3 py-2">Заробив</th>
                </tr>
              </thead>
              <tbody>
                {filteredMonthlyStats.map((item) => (
                  <tr key={`${item.managerId}-${item.monthSort}`} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.monthKey}</td>
                    <td className="px-3 py-2 text-slate-700">{item.managerName}</td>
                    <td className="px-3 py-2 text-slate-700">{item.dealsCount}</td>
                    <td className="px-3 py-2 font-bold text-emerald-700">₴ {item.commissionTotal.toLocaleString("uk-UA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Останні нарахування</h2>
          <p className="text-sm text-slate-500">Показано {visibleDeals.length} з {filteredDeals.length}</p>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
          <input
            value={dealsQuery}
            onChange={(event) => setDealsQuery(event.target.value)}
            placeholder="Пошук за ID, клієнтом, телефоном або менеджером"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
          />
          <select
            value={selectedDealsManager}
            onChange={(event) => setSelectedDealsManager(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
          >
            <option value="all">Усі менеджери</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name}</option>
            ))}
          </select>
        </div>

        {filteredDeals.length === 0 ? (
          <p className="text-sm text-slate-500">Ще немає завершених оплачених реферальних угод.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Дата</th>
                  <th className="px-3 py-2">Клієнт</th>
                  <th className="px-3 py-2">Менеджер</th>
                  <th className="px-3 py-2">Сума угоди</th>
                  <th className="px-3 py-2">5%</th>
                </tr>
              </thead>
              <tbody>
                {visibleDeals.map((deal) => (
                  <tr key={deal.bookingId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{formatDateUk(deal.date)}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{deal.clientName}</p>
                      <p className="text-xs text-slate-500">{deal.clientPhone}</p>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{deal.managerName}</td>
                    <td className="px-3 py-2 text-slate-700">₴ {deal.totalPrice.toLocaleString("uk-UA")}</td>
                    <td className="px-3 py-2 font-bold text-emerald-700">₴ {deal.commission.toLocaleString("uk-UA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredDeals.length > pageSize && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Сторінка {dealsPage} з {dealsPageCount}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={dealsPage === 1}
                onClick={() => setDealsPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={dealsPage >= dealsPageCount}
                onClick={() => setDealsPage((prev) => Math.min(dealsPageCount, prev + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Далі
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Прив'язані клієнти</h2>
          <p className="text-sm text-slate-500">Показано {visibleAssignments.length} з {filteredAssignments.length}</p>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px]">
          <input
            value={assignmentsQuery}
            onChange={(event) => setAssignmentsQuery(event.target.value)}
            placeholder="Пошук за телефоном або менеджером"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
          />
          <select
            value={selectedAssignmentsManager}
            onChange={(event) => setSelectedAssignmentsManager(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
          >
            <option value="all">Усі менеджери</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name}</option>
            ))}
          </select>
        </div>

        {filteredAssignments.length === 0 ? (
          <p className="text-sm text-slate-500">Ще немає прив'язок клієнтів.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Телефон клієнта</th>
                  <th className="px-3 py-2">Менеджер</th>
                  <th className="px-3 py-2">Дата прив'язки</th>
                </tr>
              </thead>
              <tbody>
                {visibleAssignments.map((item) => (
                  <tr key={item.clientPhoneKey} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{item.clientPhone}</td>
                    <td className="px-3 py-2 text-slate-700">{item.managerName}</td>
                    <td className="px-3 py-2 text-slate-700">{formatDateTimeUk(item.assignedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredAssignments.length > pageSize && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Сторінка {assignmentsPage} з {assignmentsPageCount}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={assignmentsPage === 1}
                onClick={() => setAssignmentsPage((prev) => Math.max(1, prev - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={assignmentsPage >= assignmentsPageCount}
                onClick={() => setAssignmentsPage((prev) => Math.min(assignmentsPageCount, prev + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
              >
                Далі
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
