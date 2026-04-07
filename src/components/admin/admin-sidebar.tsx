"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { LogoutButton } from "@/components/admin/logout-button";
import type { AdminRole } from "@/lib/admin-users";
import logoImage from "@/img/logo.jpg";

const navItems: Array<{ href: string; label: string; exact: boolean; roles: AdminRole[]; icon: React.ReactNode }> = [
  {
    href: "/admin",
    label: "Дашборд",
    exact: true,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/admin/bookings",
    label: "Бронювання",
    exact: false,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: "/admin/clients",
    label: "Клієнти",
    exact: false,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/pricing",
    label: "Ціни",
    exact: false,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/referrals",
    label: "Реферали",
    exact: false,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M9 20h6m-6 0v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: "/admin/content",
    label: "Контент сайту",
    exact: false,
    roles: ["superadmin"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "Менеджери",
    exact: false,
    roles: ["superadmin"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a3 3 0 100-6 3 3 0 000 6zM6 10a4 4 0 100-8 4 4 0 000 8zm12 11v-2a4 4 0 00-4-4h-1m-7 6v-3a4 4 0 014-4h4a4 4 0 014 4v3" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Налаштування",
    exact: true,
    roles: ["superadmin", "manager"],
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export function AdminSidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const allowedNavItems = navItems.filter((item) => item.roles.includes(role));
  const roleLabel = role === "superadmin" ? "Головний адміністратор" : "Менеджер";

  useEffect(() => {
    for (const item of allowedNavItems) {
      router.prefetch(item.href);
    }
  }, [allowedNavItems, router]);

  return (
    <aside
      className="hidden w-64 shrink-0 flex-col lg:flex"
      style={{ background: "#10243a", minHeight: "100vh" }}
    >
      {/* Brand */}
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Image
            src={logoImage}
            alt="FCDL.STORE"
            className="h-8 w-8 rounded-lg object-cover"
            priority
          />
          <div>
            <p className="text-sm font-bold leading-tight text-white">FCDL.STORE</p>
            <p className="text-[10px] text-white/55 uppercase tracking-widest">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] !text-white" style={{ color: "#ffffff" }}>
          Управління
        </p>
        {allowedNavItems.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{ color: "#ffffff" }}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[var(--green-700)] !text-white shadow-[0_8px_20px_rgba(24,92,54,0.35)]"
                  : "!text-white hover:bg-white/10 hover:!text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="space-y-0.5 border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Перейти на сайт
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}
