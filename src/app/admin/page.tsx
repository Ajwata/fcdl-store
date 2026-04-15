import Link from "next/link";
import { cookies } from "next/headers";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getBookings } from "@/lib/bookings";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  pending: "Очікує",
  confirmed: "Підтверджено",
  completed: "Завершено",
  cancelled: "Скасовано",
};

const paymentColors: Record<string, string> = {
  unpaid: "text-red-500",
  paid: "text-emerald-600",
  refunded: "text-slate-400",
};

const paymentLabels: Record<string, string> = {
  unpaid: "Не оплачено",
  paid: "Оплачено",
  refunded: "Повернено",
};

function isSameDay(dateStr: string, date: Date): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y === date.getFullYear() && m === date.getMonth() + 1 && d === date.getDate();
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

function formatDateUk(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  const bookings = await getBookings();
  const today = new Date();

  const todayBookings = bookings.filter((b) => isSameDay(b.date, today));
  const weekRevenue = bookings
    .filter((b) => isThisWeek(b.date) && b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalPrice, 0);
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const uniqueClients = new Set(bookings.map((b) => b.clientPhone)).size;

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const upcomingBookings = bookings
    .filter((b) => {
      const d = new Date(b.date + "T00:00:00");
      return d >= today && b.status !== "cancelled";
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const stats = [
    {
      label: "Бронювань сьогодні",
      value: todayBookings.length,
      sub: today.toLocaleDateString("uk-UA", { day: "numeric", month: "long" }),
      icon: (
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      color: "bg-blue-500",
    },
    {
      label: "Виручка тижня",
      value: `₴ ${weekRevenue.toLocaleString("uk-UA")}`,
      sub: "оплачені бронювання",
      icon: (
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "bg-emerald-500",
    },
    {
      label: "Очікують підтвердження",
      value: pendingCount,
      sub: pendingCount > 0 ? "потребують уваги" : "все оброблено",
      icon: (
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: pendingCount > 0 ? "bg-amber-500" : "bg-slate-400",
    },
    {
      label: "Клієнтів всього",
      value: uniqueClients,
      sub: `${bookings.length} бронювань`,
      icon: (
        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "bg-purple-500",
    },
  ];

  const modules = [
    {
      title: "Бронювання",
      description: "Підтверджуйте заявки, змінюйте статуси і оплату.",
      href: "/admin/bookings",
      value: `${bookings.length} записів`,
      accent: "from-blue-500 to-blue-600",
    },
    {
      title: "Клієнти",
      description: "Дивіться базу клієнтів та історію активності.",
      href: "/admin/clients",
      value: `${uniqueClients} клієнтів`,
      accent: "from-emerald-500 to-emerald-600",
    },
    {
      title: "Реферали",
      description: "Нарахування 5% менеджерам за оплачені завершені ігри.",
      href: "/admin/referrals",
      value: "Партнерська статистика",
      accent: "from-violet-500 to-fuchsia-600",
    },
    {
      title: "Контент сайту",
      description: "Редагуйте тексти, новини, фото та блоки сайту.",
      href: "/admin/content",
      value: "CMS редактор",
      accent: "from-indigo-500 to-indigo-600",
      roles: ["superadmin"],
    },
    {
      title: "Менеджери",
      description: "Створення менеджерських акаунтів та доступів.",
      href: "/admin/users",
      value: "Доступи адмінки",
      accent: "from-rose-500 to-rose-600",
      roles: ["superadmin"],
    },
  ];

  const role = session?.role ?? "manager";
  const allowedModules = modules.filter((module) => !module.roles || module.roles.includes(role));

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Дашборд</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {today.toLocaleDateString("uk-UA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        {pendingCount > 0 && (
          <Link
            href="/admin/bookings?status=pending"
            className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            {pendingCount} очікують підтвердження →
          </Link>
        )}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {allowedModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`mb-3 h-1.5 w-16 rounded-full bg-gradient-to-r ${module.accent}`} />
            <h2 className="text-lg font-bold text-slate-900">{module.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{module.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{module.value}</span>
              <span className="text-sm font-semibold text-[var(--green-700)] transition group-hover:translate-x-0.5">
                Відкрити →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">{stat.label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent bookings */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-800">Останні бронювання</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-[var(--green-700)] hover:underline">
              Всі →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Клієнт</th>
                  <th className="px-4 py-3">Дата / Час</th>
                  <th className="px-4 py-3">Поле</th>
                  <th className="px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-slate-800">{b.clientName}</p>
                      <p className="text-xs text-slate-500">{b.clientPhone}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateUk(b.date)}
                      <br />
                      <span className="text-xs text-slate-500">
                        {b.startTime}–{b.endTime}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">Поле {b.sector}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {statusLabels[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-800">Найближчі</h2>
            <Link href="/admin/bookings" className="text-xs font-semibold text-[var(--green-700)] hover:underline">
              Всі →
            </Link>
          </div>
          <div className="space-y-2 p-4">
            {upcomingBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Немає запланованих бронювань</p>
            ) : (
              upcomingBookings.map((b) => (
                <div key={b.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{b.clientName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateUk(b.date)} · {b.startTime}–{b.endTime}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--green-700)]">
                      Поле {b.sector}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs font-medium ${paymentColors[b.paymentStatus] ?? ""}`}>
                      {paymentLabels[b.paymentStatus] ?? b.paymentStatus}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      ₴ {b.totalPrice.toLocaleString("uk-UA")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
