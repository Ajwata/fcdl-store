import { cookies } from "next/headers";
import Link from "next/link";

import { AccountBookings } from "@/components/account/account-bookings";
import { AccountNav } from "@/components/account/account-nav";
import { autoCompleteExpiredPaidBookings, filterBookingsForUser } from "@/lib/bookings";
import { getCmsContent } from "@/lib/cms-content";
import { getClientUserById } from "@/lib/client-auth";
import { getClientReviews } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

export const dynamic = "force-dynamic";

export default async function AccountBookingsPage() {
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
          <p className="mt-2 text-sm text-slate-600">Увійдіть повторно, щоб керувати своїми бронюваннями.</p>
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

  const bookings = filterBookingsForUser(await autoCompleteExpiredPaidBookings(), payload.uid, user.phone).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );

  const reviews = await getClientReviews(payload.uid, user.phone);
  const cms = await getCmsContent();

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <AccountNav
          title="Бронювання"
          subtitle="Окрема сторінка для керування активними і минулими записами, повтором та відгуками."
        />
        <AccountBookings
          initialBookings={bookings}
          initialReviews={reviews}
          paymentRequisites={cms.paymentRequisites}
        />
      </section>
    </main>
  );
}
