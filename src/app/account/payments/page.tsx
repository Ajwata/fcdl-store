import { cookies } from "next/headers";
import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";
import { filterBookingsForUser, getBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

const paymentLabel = {
  unpaid: "Не оплачено",
  paid: "Оплачено",
  refunded: "Повернено",
} as const;

const paymentClass = {
  unpaid: "text-rose-700 bg-rose-100",
  paid: "text-emerald-700 bg-emerald-100",
  refunded: "text-slate-700 bg-slate-200",
} as const;

export default async function AccountPaymentsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return (
      <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
          <h1 className="text-2xl font-bold text-[var(--blue-950)]">Сесія завершилась</h1>
          <p className="mt-2 text-sm text-slate-600">Увійдіть, щоб переглядати ваші платежі.</p>
          <Link href="/account/login" className="mt-5 inline-flex rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">Увійти</Link>
        </section>
      </main>
    );
  }

  const user = await getClientUserById(payload.uid);
  const bookings = filterBookingsForUser(await getBookings(), payload.uid, user?.phone ?? payload.phone).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );

  const paidAmount = bookings.filter((b) => b.paymentStatus === "paid").reduce((sum, b) => sum + b.totalPrice, 0);
  const unpaidAmount = bookings.filter((b) => b.paymentStatus === "unpaid" && b.status !== "cancelled").reduce((sum, b) => sum + b.totalPrice, 0);

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <AccountNav
          title="Платежі та рахунки"
          subtitle={`${user?.name ?? "Клієнт"}, доступні варіанти оплати: готівка або переказ на IBAN.`}
        />

        <div className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Оплачено</p>
              <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{paidAmount.toLocaleString("uk-UA")} грн</p>
            </div>
            <div className="rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">До сплати</p>
              <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{unpaidAmount.toLocaleString("uk-UA")} грн</p>
            </div>
            <div className="rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Записів</p>
              <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{bookings.length}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/#booking" className="rounded-full bg-[var(--green-700)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] !text-white">Нова бронь</Link>
            <a href="/api/account/documents/export" className="rounded-full border border-[var(--blue-200)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--blue-900)]">Експорт CSV</a>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4 text-sm text-slate-700">
            <p className="font-semibold text-[var(--blue-950)]">Варіанти оплати</p>
            <p className="mt-1">1) Готівкою на локації.</p>
            <p className="mt-1">2) Переказом на IBAN за реквізитами адміністратора.</p>
            <p className="mt-2 text-xs text-slate-500">Після фактичної оплати статус виставляє адміністратор.</p>
          </div>
        </div>

        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--blue-200)] bg-white px-6 py-10 text-center text-sm text-slate-600">Платежів поки немає.</div>
          ) : (
            bookings.map((booking) => (
              <article key={booking.id} className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--blue-700)]">Поле {booking.sector}</p>
                    <p className="mt-1 text-base font-semibold text-[var(--blue-950)]">{booking.date} · {booking.startTime}-{booking.endTime}</p>
                    <p className="mt-1 text-sm text-slate-600">Статус броні: {booking.status}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentClass[booking.paymentStatus]}`}>{paymentLabel[booking.paymentStatus]}</span>
                    <p className="text-lg font-bold text-[var(--blue-950)]">{booking.totalPrice.toLocaleString("uk-UA")} грн</p>
                    <div className="flex gap-2">
                      <a
                        href={`/api/account/documents/receipt/${booking.id}`}
                        className="rounded-full border border-[var(--blue-200)] bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]"
                      >
                        Квитанція
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
