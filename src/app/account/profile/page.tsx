import { cookies } from "next/headers";
import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";
import { AccountPasswordEditor } from "@/components/account/account-password-editor";
import { AccountProfileEditor } from "@/components/account/account-profile-editor";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

export default async function AccountProfilePage() {
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
          <p className="mt-2 text-sm text-slate-600">Увійдіть повторно, щоб редагувати профіль.</p>
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

  return (
    <main className="page-shell min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <section className="mx-auto w-full max-w-6xl space-y-6">
        <AccountNav
          title="Профіль"
          subtitle="Налаштуйте контактні дані та аватар, щоб адміністратору було простіше з вами зв'язатися."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--blue-100)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Телефон</p>
            <p className="mt-1 text-lg font-bold text-[var(--blue-950)]">{user.phone}</p>
          </div>
          <div className="rounded-2xl border border-[var(--blue-100)] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">Профіль</p>
            <p className="mt-1 text-lg font-bold text-[var(--blue-950)]">{user.name}</p>
          </div>
        </div>

        <AccountProfileEditor
          initialName={user.name}
          initialPhone={user.phone}
          initialAvatarUrl={user.avatarUrl}
        />

        <AccountPasswordEditor hasPassword={!!user.passwordHash} />
      </section>
    </main>
  );
}
