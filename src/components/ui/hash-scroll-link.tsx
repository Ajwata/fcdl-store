"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

type HashScrollLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

function normalizePathname(value: string): string {
  if (!value || value === "/") return "/";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function parseTarget(href: string): { pathname: string; hash: string } | null {
  try {
    const url = new URL(href, window.location.origin);
    return { pathname: normalizePathname(url.pathname), hash: url.hash };
  } catch {
    return null;
  }
}

export function HashScrollLink({ href, className, children }: HashScrollLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = parseTarget(href);
    if (!target || !target.hash) return;

    const currentPath = normalizePathname(window.location.pathname);
    if (currentPath !== target.pathname) return;

    const elementId = target.hash.slice(1);
    if (!elementId) return;

    const targetElement = document.getElementById(elementId);
    if (!targetElement) return;

    event.preventDefault();
    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });

    const nextUrl = `${target.pathname}${target.hash}`;
    if (window.location.hash === target.hash) {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
