import { cookies } from "next/headers";

import { AdminTopNav } from "@/components/admin/admin-top-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { verifySessionToken } from "@/lib/auth";

export const metadata = {
  title: "Адмін-панель | FCDL.STORE",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    // Login page: render centered dark screen (middleware handles redirect for other pages)
    return (
      <div
        className="flex min-h-screen items-center justify-center p-4"
        style={{ background: "#0a1628" }}
      >
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "#eaf1f8" }}>
      <AdminSidebar role={session.role} />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <AdminTopNav role={session.role} adminName={session.name} />
        {children}
      </div>
    </div>
  );
}
