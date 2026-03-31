"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { navigationItems } from "@/data/site-content";
import logoImage from "@/img/logo.jpg";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthorized = false;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/82 shadow-[0_8px_26px_rgba(8,26,51,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="shrink-0">
          <Image
            src={logoImage}
            alt="FCDL.STORE"
            className="h-9 w-auto rounded-md object-cover sm:h-10"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--blue-900)] lg:flex">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href} className="ui-link transition hover:text-[var(--green-700)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="ui-chip-button inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--blue-100)] bg-white/80 text-[var(--blue-900)] lg:hidden"
            aria-label="Відкрити меню"
          >
            ☰
          </button>

          {isAuthorized ? (
            <button
              type="button"
              className="cta-secondary inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] !text-white transition hover:bg-[var(--blue-800)] sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.14em]"
            >
              Особистий кабінет
            </button>
          ) : (
            <Link
              href="#"
              className="cta-secondary inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] !text-white transition hover:bg-[var(--blue-800)] sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.14em]"
            >
              Увійти
            </Link>
          )}
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/45 bg-white/95 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-bold text-[var(--blue-900)]">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-[12px] px-3 py-2 transition hover:bg-[var(--blue-50)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}