import { cookies } from "next/headers";

import { AdminUsersManager } from "@/components/admin/admin-users-manager";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const metadata = {
  title: "Менеджери | Адмін",
};

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session || session.role !== "superadmin") {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          Цей розділ доступний тільки головному адміністратору.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Менеджери адмінки</h1>
        <p className="mt-0.5 text-sm text-slate-500">Створюйте менеджерські акаунти та керуйте доступом.</p>
      </div>
      <AdminUsersManager />
    </div>
  );
}
