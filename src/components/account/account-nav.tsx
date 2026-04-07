"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/account", label: "Огляд" },
  { href: "/account/bookings", label: "Бронювання" },
  { href: "/account/payments", label: "Платежі" },
  { href: "/account/notifications", label: "Сповіщення" },
  { href: "/account/profile", label: "Профіль" },
];

type AccountNavProps = {
  title: string;
  subtitle: string;
};

export function AccountNav({ title, subtitle }: AccountNavProps) {
  const pathname = usePathname();

  return (
    <section className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.10)] sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Особистий кабінет</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--blue-950)]">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

      <nav className="mt-5 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((item) => {
          const isActive = item.href === "/account" ? pathname === "/account" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${
                isActive
                  ? "bg-[var(--blue-900)] !text-white"
                  : "border border-[var(--blue-200)] bg-[var(--blue-50)] text-[var(--blue-900)] hover:bg-[var(--blue-100)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
