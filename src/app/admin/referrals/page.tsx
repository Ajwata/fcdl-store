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

type MonthlyStat = {
  monthKey: string;
  monthSort: string;
  managerId: string;
  managerName: string;
  dealsCount: number;
  commissionTotal: number;
};

type TablePage<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

type ResponseShape = {
  role: "superadmin" | "manager";
  managers: Manager[];
  report: {
    managerStats: ManagerReferralStats[];
    monthlyStats: MonthlyStat[];
    totals: {
      referredClients: number;
      clientsWithDeals: number;
      dealsCount: number;
      commissionTotal: number;
    };
  };
  tables: {
    deals: TablePage<ReferralDeal>;
    assignments: TablePage<ReferralAssignment>;
  };
};

type DealsSortKey = "date" | "bookingId" | "clientName" | "managerName" | "totalPrice" | "commission";
type AssignmentsSortKey = "assignedAt" | "clientPhone" | "managerName";
type SortDir = "asc" | "desc";

const pageSize = 25;

export default function AdminReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<ResponseShape | null>(null);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const [dealsQuery, setDealsQuery] = useState("");
  const [selectedDealsManager, setSelectedDealsManager] = useState<string>("all");
  const [dealsPage, setDealsPage] = useState(1);
  const [dealsSortKey, setDealsSortKey] = useState<DealsSortKey>("date");
  const [dealsSortDir, setDealsSortDir] = useState<SortDir>("desc");

  const [assignmentsQuery, setAssignmentsQuery] = useState("");
  const [selectedAssignmentsManager, setSelectedAssignmentsManager] = useState<string>("all");
  const [assignmentsPage, setAssignmentsPage] = useState(1);
  const [assignmentsSortKey, setAssignmentsSortKey] = useState<AssignmentsSortKey>("assignedAt");
  const [assignmentsSortDir, setAssignmentsSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    setDealsPage(1);
  }, [dealsQuery, selectedDealsManager]);

  useEffect(() => {
    setAssignmentsPage(1);
  }, [assignmentsQuery, selectedAssignmentsManager]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          dealsPage: String(dealsPage),
          dealsLimit: String(pageSize),
          dealsQuery,
          dealsManager: selectedDealsManager,
          dealsSortKey,
          dealsSortDir,
          assignmentsPage: String(assignmentsPage),
          assignmentsLimit: String(pageSize),
          assignmentsQuery,
          assignmentsManager: selectedAssignmentsManager,
          assignmentsSortKey,
          assignmentsSortDir,
        });

        const res = await fetch(`/api/admin/referrals?${params.toString()}`, { cache: "no-store" });
        const result = (await res.json()) as ResponseShape & { error?: string };
        if (!res.ok) {
          if (cancelled) return;
          setError(result.error ?? "Не вдалося завантажити реферальні дані");
          setData(null);
          return;
        }
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) {
          setError("Помилка мережі");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [
    dealsPage,
    dealsQuery,
    selectedDealsManager,
    dealsSortKey,
    dealsSortDir,
    assignmentsPage,
    assignmentsQuery,
    selectedAssignmentsManager,
    assignmentsSortKey,
    assignmentsSortDir,
  ]);

  const stats = useMemo(() => data?.report.managerStats ?? [], [data]);
  const monthlyStats = useMemo(() => data?.report.monthlyStats ?? [], [data]);
  const managerOptions = useMemo(() => data?.managers ?? [], [data]);

  const filteredMonthlyStats = useMemo(() => {
    if (selectedMonth === "all") return monthlyStats;
    return monthlyStats.filter((item) => item.monthSort === selectedMonth);
  }, [monthlyStats, selectedMonth]);

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

  const dealsTable = data?.tables.deals;
  const assignmentsTable = data?.tables.assignments;

  const toggleDealsSort = (key: DealsSortKey) => {
    if (dealsSortKey === key) {
      setDealsSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setDealsSortKey(key);
    setDealsSortDir(key === "date" || key === "totalPrice" || key === "commission" ? "desc" : "asc");
  };

  const toggleAssignmentsSort = (key: AssignmentsSortKey) => {
    if (assignmentsSortKey === key) {
      setAssignmentsSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setAssignmentsSortKey(key);
    setAssignmentsSortDir(key === "assignedAt" ? "desc" : "asc");
  };

  const sortIndicator = (active: boolean, dir: SortDir) => {
    if (!active) return "";
    return dir === "asc" ? " ↑" : " ↓";
  };

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
    const monthLabel = selectedMonth === "all" ? "all" : selectedMonth;
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
    <main className="flex-1 space-y-6 p-6 lg:p-8">
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Заробіток по менеджерах</h2>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-500">Поки немає даних.</p>
        ) : (
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
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
          <div className="max-h-[460px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white">
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
          <p className="text-sm text-slate-500">Показано {dealsTable?.items.length ?? 0} з {dealsTable?.total ?? 0}</p>
        </div>

        <div className="sticky top-3 z-20 mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[1fr_220px]">
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

        {!dealsTable || dealsTable.total === 0 ? (
          <p className="text-sm text-slate-500">Ще немає завершених оплачених реферальних угод.</p>
        ) : (
          <>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("date")} className="hover:text-slate-700">
                        Дата{sortIndicator(dealsSortKey === "date", dealsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("clientName")} className="hover:text-slate-700">
                        Клієнт{sortIndicator(dealsSortKey === "clientName", dealsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("managerName")} className="hover:text-slate-700">
                        Менеджер{sortIndicator(dealsSortKey === "managerName", dealsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("totalPrice")} className="hover:text-slate-700">
                        Сума угоди{sortIndicator(dealsSortKey === "totalPrice", dealsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("commission")} className="hover:text-slate-700">
                        5%{sortIndicator(dealsSortKey === "commission", dealsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleDealsSort("bookingId")} className="hover:text-slate-700">
                        ID{sortIndicator(dealsSortKey === "bookingId", dealsSortDir)}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dealsTable.items.map((deal) => (
                    <tr key={deal.bookingId} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-700">{formatDateUk(deal.date)}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold text-slate-800">{deal.clientName}</p>
                        <p className="text-xs text-slate-500">{deal.clientPhone}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{deal.managerName}</td>
                      <td className="px-3 py-2 text-slate-700">₴ {deal.totalPrice.toLocaleString("uk-UA")}</td>
                      <td className="px-3 py-2 font-bold text-emerald-700">₴ {deal.commission.toLocaleString("uk-UA")}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{deal.bookingId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Сторінка {dealsTable.page} з {dealsTable.pageCount}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={dealsTable.page <= 1}
                  onClick={() => setDealsPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={dealsTable.page >= dealsTable.pageCount}
                  onClick={() => setDealsPage((prev) => Math.min(dealsTable.pageCount, prev + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Прив'язані клієнти</h2>
          <p className="text-sm text-slate-500">Показано {assignmentsTable?.items.length ?? 0} з {assignmentsTable?.total ?? 0}</p>
        </div>

        <div className="sticky top-3 z-20 mb-4 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-[1fr_220px]">
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

        {!assignmentsTable || assignmentsTable.total === 0 ? (
          <p className="text-sm text-slate-500">Ще немає прив'язок клієнтів.</p>
        ) : (
          <>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleAssignmentsSort("clientPhone")} className="hover:text-slate-700">
                        Телефон клієнта{sortIndicator(assignmentsSortKey === "clientPhone", assignmentsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleAssignmentsSort("managerName")} className="hover:text-slate-700">
                        Менеджер{sortIndicator(assignmentsSortKey === "managerName", assignmentsSortDir)}
                      </button>
                    </th>
                    <th className="px-3 py-2">
                      <button type="button" onClick={() => toggleAssignmentsSort("assignedAt")} className="hover:text-slate-700">
                        Дата прив'язки{sortIndicator(assignmentsSortKey === "assignedAt", assignmentsSortDir)}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentsTable.items.map((item) => (
                    <tr key={item.clientPhoneKey} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 text-slate-700">{item.clientPhone}</td>
                      <td className="px-3 py-2 text-slate-700">{item.managerName}</td>
                      <td className="px-3 py-2 text-slate-700">{formatDateTimeUk(item.assignedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">Сторінка {assignmentsTable.page} з {assignmentsTable.pageCount}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={assignmentsTable.page <= 1}
                  onClick={() => setAssignmentsPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Назад
                </button>
                <button
                  type="button"
                  disabled={assignmentsTable.page >= assignmentsTable.pageCount}
                  onClick={() => setAssignmentsPage((prev) => Math.min(assignmentsTable.pageCount, prev + 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
                >
                  Далі
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
