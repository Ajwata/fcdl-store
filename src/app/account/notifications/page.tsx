import { cookies } from "next/headers";
import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";
import { getClientUserById } from "@/lib/client-auth";
import { getClientNotifications, markClientNotificationsRead } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { formatDateTimeUk } from "@/lib/date-format";

export default async function AccountNotificationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);
  const user = payload ? await getClientUserById(payload.uid) : null;

  if (!payload || !user) {
    return (
      <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
        <section className="mx-auto w-full max-w-4xl rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
          <h1 className="text-2xl font-bold text-[var(--blue-950)]">Сесія завершилась</h1>
          <p className="mt-2 text-sm text-slate-600">Увійдіть, щоб переглянути сповіщення.</p>
          <Link href="/account/login" className="mt-5 inline-flex rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
            Увійти
          </Link>
        </section>
      </main>
    );
  }

  await markClientNotificationsRead(payload.uid, user.phone);
  const notifications = await getClientNotifications(payload.uid, user.phone);

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <AccountNav
          title="Центр сповіщень"
          subtitle="Підтвердження бронювань, оплати, повтори, відгуки та інші важливі оновлення."
        />

        <div className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
          <div className="flex flex-wrap gap-2">
            <a href="/#booking" className="rounded-full bg-[var(--green-700)] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] !text-white">
              Нова бронь
            </a>
          </div>
        </div>

        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--blue-200)] bg-white px-6 py-10 text-center text-sm text-slate-600">
              У вас поки немає сповіщень.
            </div>
          ) : (
            notifications.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_28px_rgba(8,26,51,0.06)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-[var(--blue-950)]">{item.title}</p>
                  <p className="text-xs text-slate-500">{formatDateTimeUk(item.createdAt)}</p>
                </div>
                <p className="mt-2 text-sm text-slate-700">{item.message}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
