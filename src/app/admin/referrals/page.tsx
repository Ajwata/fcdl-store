"use client";

import { useEffect, useMemo, useState } from "react";

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
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Останні нарахування</h2>
        {deals.length === 0 ? (
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
                {deals.slice(0, 100).map((deal) => (
                  <tr key={deal.bookingId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{deal.date}</td>
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
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Прив'язані клієнти</h2>
        {assignments.length === 0 ? (
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
                {assignments.map((item) => (
                  <tr key={item.clientPhoneKey} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{item.clientPhone}</td>
                    <td className="px-3 py-2 text-slate-700">{item.managerName}</td>
                    <td className="px-3 py-2 text-slate-700">{new Date(item.assignedAt).toLocaleString("uk-UA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
