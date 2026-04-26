"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import logoImage from "@/img/logo.jpg";

type NavigationItem = {
  label: string;
  href: string;
};

type SiteHeaderProps = {
  navigationItems: NavigationItem[];
  logoUrl?: string;
  siteName?: string;
};

function isHomeAnchorHref(href: string): boolean {
  return href.startsWith("/#") || href.startsWith("#");
}

function normalizeHomeAnchorHref(href: string): string {
  if (href.startsWith("/#")) return href;
  if (href.startsWith("#")) return `/${href}`;
  return href;
}

function normalizeAvatarUrl(value: string | null | undefined): string {
  const avatar = (value ?? "").trim();
  if (!avatar) return "";
  const uploadsMatch = avatar.match(/(?:^|\/)uploads\/avatars\/([^/?#]+)$/i);
  if (uploadsMatch) return `/api/account/avatar?file=${encodeURIComponent(uploadsMatch[1])}`;
  const apiFileMatch = avatar.match(/[?&]file=([^&#]+)/i);
  if (apiFileMatch) return `/api/account/avatar?file=${apiFileMatch[1]}`;
  const rawFileMatch = avatar.match(/^(avatar-.+\.(png|jpe?g|webp|gif))$/i);
  if (rawFileMatch) return `/api/account/avatar?file=${encodeURIComponent(rawFileMatch[1])}`;
  if (/^https?:\/\//i.test(avatar) || avatar.startsWith("/")) return avatar;
  if (avatar.startsWith("uploads/")) return `/${avatar}`;
  if (/^avatar-.+\.(png|jpe?g|webp|gif)$/i.test(avatar)) return `/uploads/avatars/${avatar}`;
  return `/${avatar}`;
}

export function SiteHeader({ navigationItems, logoUrl, siteName = "FCDL.STORE" }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountName, setAccountName] = useState("Кабінет");
  const [accountAvatar, setAccountAvatar] = useState("");
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/account/session", { cache: "no-store" });
        const result = (await response.json()) as {
          authenticated?: boolean;
          notificationsCount?: number;
          user?: { name?: string; avatarUrl?: string } | null;
        };
        if (cancelled) return;
        setIsAuthorized(Boolean(result.authenticated));
        setNotificationsCount(result.notificationsCount ?? 0);
        setAccountName(result.user?.name?.trim() || "Кабінет");
        setAccountAvatar(normalizeAvatarUrl(result.user?.avatarUrl));
      } catch {
        if (cancelled) return;
        setIsAuthorized(false);
        setNotificationsCount(0);
        setAccountName("Кабінет");
        setAccountAvatar("");
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const onWindowClick = (event: MouseEvent) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      window.addEventListener("mousedown", onWindowClick);
    }
    return () => {
      window.removeEventListener("mousedown", onWindowClick);
    };
  }, [accountMenuOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAuthorized(false);
    setNotificationsCount(0);
    setAccountMenuOpen(false);
    router.push("/account/login");
    router.refresh();
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/60 bg-white/82 shadow-[0_8px_26px_rgba(8,26,51,0.08)] backdrop-blur-xl">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="shrink-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={siteName}
              className="h-9 w-auto rounded-md object-cover sm:h-10"
            />
          ) : (
            <Image
              src={logoImage}
              alt={siteName}
              className="h-9 w-auto rounded-md object-cover sm:h-10"
              priority
            />
          )}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold text-[var(--blue-900)] lg:flex">
          {navigationItems.map((item) => {
            const href = normalizeHomeAnchorHref(item.href);
            if (isHomeAnchorHref(item.href)) {
              return (
                <a key={item.href} href={href} className="ui-link transition hover:text-[var(--green-700)]">
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.href} href={href} className="ui-link transition hover:text-[var(--green-700)]">
                {item.label}
              </Link>
            );
          })}
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
            <>
              <Link
                href="/account/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--blue-200)] bg-white/90 text-[var(--blue-900)] transition hover:bg-[var(--blue-50)]"
                aria-label="Сповіщення"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.389 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notificationsCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {notificationsCount > 9 ? "9+" : notificationsCount}
                  </span>
                )}
              </Link>

              <div ref={accountMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--blue-200)] bg-white/95 px-2.5 py-1.5 text-[var(--blue-900)] transition hover:bg-[var(--blue-50)]"
                >
                  <img
                    src={accountAvatar || "/window.svg"}
                    alt="Аватар"
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith("/window.svg")) return;
                      event.currentTarget.src = "/window.svg";
                    }}
                  />
                  <span className="hidden max-w-[120px] truncate text-xs font-extrabold uppercase tracking-[0.08em] sm:block">
                    {accountName}
                  </span>
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 top-12 z-30 w-64 rounded-2xl border border-[var(--blue-100)] bg-white p-2 shadow-[0_20px_50px_rgba(8,26,51,0.18)]">
                    <p className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Меню кабінету</p>
                    <div className="space-y-1">
                      <Link href="/account" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--blue-900)] hover:bg-[var(--blue-50)]">Огляд</Link>
                      <Link href="/account/bookings" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--blue-900)] hover:bg-[var(--blue-50)]">Бронювання</Link>
                      <Link href="/account/payments" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--blue-900)] hover:bg-[var(--blue-50)]">Платежі</Link>
                      <Link href="/account/notifications" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--blue-900)] hover:bg-[var(--blue-50)]">Сповіщення</Link>
                      <Link href="/account/profile" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-[var(--blue-900)] hover:bg-[var(--blue-50)]">Профіль</Link>
                      <a href="/#booking" onClick={() => setAccountMenuOpen(false)} className="block rounded-xl bg-[var(--green-700)] px-3 py-2 text-sm font-semibold !text-white hover:bg-[var(--green-800)]">Нова бронь</a>
                    </div>
                    <div className="mt-2 border-t border-[var(--blue-100)] pt-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Вийти з кабінету
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/account/login"
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
            {navigationItems.map((item) => {
              const href = normalizeHomeAnchorHref(item.href);
              if (isHomeAnchorHref(item.href)) {
                return (
                  <a
                    key={item.href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[12px] px-3 py-2 transition hover:bg-[var(--blue-50)]"
                  >
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[12px] px-3 py-2 transition hover:bg-[var(--blue-50)]"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}