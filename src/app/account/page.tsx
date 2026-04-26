import { cookies } from "next/headers";
import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";
import { filterBookingsForUser, getBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { getClientNotifications } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { formatDateUk } from "@/lib/date-format";

export const dynamic = "force-dynamic";

function isActiveBookingStatus(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);
  const user = payload ? await getClientUserById(payload.uid) : null;

  if (!user || !payload) {
    return (
      <main className="page-shell min-h-screen px-4 py-16 sm:px-6 lg:px-10">
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Особистий кабінет</p>
          <h1 className="mt-2 text-3xl font-bold text-[var(--blue-950)]">Сесія завершилась</h1>
          <p className="mt-2 text-sm text-slate-600">Увійдіть повторно, щоб перейти до сторінок кабінету.</p>
          <div className="mt-6">
            <Link
              href="/account/login"
              className="rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--green-800)]"
            >
              Увійти
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [bookings, notifications] = await Promise.all([
    getBookings(),
    getClientNotifications(payload.uid, user.phone),
  ]);

  const userBookings = filterBookingsForUser(bookings, payload.uid, user.phone).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );

  const nonCancelledBookings = userBookings.filter((item) => item.status !== "cancelled");
  const upcoming = userBookings.filter((item) => isActiveBookingStatus(item.status));
  const unpaid = userBookings.filter((item) => item.paymentStatus === "unpaid" && item.status !== "cancelled");
  const nextMatch = [...upcoming].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0] ?? null;

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <AccountNav
          title={`Вітаємо, ${user.name}`}
          subtitle="Кабінет поділено на окремі сторінки: бронювання, платежі, сповіщення та профіль."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Усього бронювань</p>
            <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{nonCancelledBookings.length}</p>
          </article>
          <article className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Активні ігри</p>
            <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{upcoming.length}</p>
          </article>
          <article className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">До сплати</p>
            <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{unpaid.length}</p>
          </article>
          <article className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Сповіщення</p>
            <p className="mt-1 text-3xl font-black text-[var(--blue-950)]">{notifications.length}</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_16px_40px_rgba(8,26,51,0.1)]">
            <h2 className="text-xl font-bold text-[var(--blue-950)]">Найближча гра</h2>
            {nextMatch ? (
              <>
                <p className="mt-3 text-lg font-semibold text-[var(--blue-950)]">{formatDateUk(nextMatch.date)} о {nextMatch.startTime}</p>
                <p className="mt-1 text-sm text-slate-600">Поле {nextMatch.sector} · {nextMatch.durationHours} год</p>
                <p className="mt-3 text-2xl font-black text-[var(--blue-950)]">{nextMatch.totalPrice.toLocaleString("uk-UA")} грн</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">У вас поки немає запланованих ігор.</p>
            )}
            <Link
              href="/account/bookings"
              className="mt-5 inline-flex rounded-full border border-[var(--blue-200)] bg-[var(--blue-50)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--blue-900)]"
            >
              Керувати бронюваннями
            </Link>
          </section>

          <section className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_16px_40px_rgba(8,26,51,0.1)]">
            <h2 className="text-xl font-bold text-[var(--blue-950)]">Швидкі дії</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link href="/account/profile" className="rounded-2xl border border-[var(--blue-200)] bg-[var(--blue-50)] px-4 py-3 text-sm font-semibold text-[var(--blue-900)]">Редагувати профіль</Link>
              <Link href="/account/payments" className="rounded-2xl border border-[var(--blue-200)] bg-[var(--blue-50)] px-4 py-3 text-sm font-semibold text-[var(--blue-900)]">Перевірити платежі</Link>
              <Link href="/account/notifications" className="rounded-2xl border border-[var(--blue-200)] bg-[var(--blue-50)] px-4 py-3 text-sm font-semibold text-[var(--blue-900)]">Відкрити сповіщення</Link>
              <a href="/#booking" className="rounded-2xl bg-[var(--green-700)] px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] !text-white">Нова бронь</a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
