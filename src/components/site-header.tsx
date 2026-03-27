import Image from "next/image";
import Link from "next/link";

import { navigationItems } from "@/data/site-content";
import logoImage from "@/img/logo.jpg";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:gap-6 sm:px-6 sm:py-4 lg:px-10">
        <Link href="/" className="shrink-0">
          <Image
            src={logoImage}
            alt="FCDL.STORE"
            className="h-10 w-auto rounded-md object-cover sm:h-12 lg:h-14"
            priority
          />
          <p className="mt-1 hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 sm:block">
            Оренда футбольного поля
          </p>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--blue-900)] lg:flex">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-[var(--green-700)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/booking"
          className="inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] !text-white transition hover:bg-[var(--blue-800)] hover:!text-white sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.14em]"
        >
          Забронювати
        </Link>
      </div>
    </header>
  );
}