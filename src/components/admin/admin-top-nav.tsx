"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/admin/logout-button";
import type { AdminRole } from "@/lib/admin-users";

const navItems: Array<{ href: string; label: string; exact: boolean; roles: AdminRole[] }> = [
  { href: "/admin", label: "Дашборд", exact: true, roles: ["superadmin", "manager"] },
  { href: "/admin/bookings", label: "Бронювання", exact: false, roles: ["superadmin", "manager"] },
  { href: "/admin/clients", label: "Клієнти", exact: false, roles: ["superadmin", "manager"] },
  { href: "/admin/content", label: "Контент сайту", exact: false, roles: ["superadmin"] },
  { href: "/admin/users", label: "Менеджери", exact: false, roles: ["superadmin"] },
];

export function AdminTopNav({ role, adminName }: { role: AdminRole; adminName: string }) {
  const pathname = usePathname();
  const filteredNav = navItems.filter((item) => item.roles.includes(role));
  const roleLabel = role === "superadmin" ? "Головний адміністратор" : "Менеджер";

  return (
    <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <div className="flex flex-wrap gap-2">
          {filteredNav.map((item) => {
            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ color: "#ffffff" }}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[var(--green-700)] !text-white"
                    : "bg-slate-700 !text-white hover:bg-slate-600 hover:!text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 md:block">
            {adminName} · {roleLabel}
          </div>
          <Link
            href="/"
            target="_blank"
            className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            Перейти на сайт
          </Link>
          <div className="rounded-full bg-red-50 px-0.5 py-0.5">
            <LogoutButton compact />
          </div>
        </div>
      </div>
    </div>
  );
}
