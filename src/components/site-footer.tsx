import Image from "next/image";
import Link from "next/link";

import { FooterContent } from "@/data/cms-defaults";
import logoImage from "@/img/logo.jpg";

type FooterLink = {
  label: string;
  href: string;
};

type SiteFooterProps = {
  footerNavLinks: FooterLink[];
  footerDocLinks: FooterLink[];
  footerSocialLinks: FooterLink[];
  footerContent: FooterContent;
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

export function SiteFooter({ footerNavLinks, footerDocLinks, footerSocialLinks, footerContent, logoUrl, siteName = "FCDL.STORE" }: SiteFooterProps) {
  const resolvedLogo = footerContent.logoUrl || logoUrl;

  return (
    <footer className="mt-auto border-t border-white/40 bg-[var(--blue-950)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.8fr_0.8fr_0.8fr] lg:px-10">
        <div>
          {resolvedLogo ? (
            <Image src={resolvedLogo} alt={siteName} width={200} height={80} className="h-12 w-auto rounded-md object-cover sm:h-14 lg:h-16" />
          ) : (
            <Image src={logoImage} alt={siteName} className="h-12 w-auto rounded-md object-cover sm:h-14 lg:h-16" />
          )}
          <p className="mt-4 max-w-md text-base leading-7 text-white/72">
            {footerContent.description}
          </p>
          <div className="mt-5 space-y-2 text-sm text-white/82">
            <p>{footerContent.address}</p>
            <p>{footerContent.phone}</p>
            <p>{footerContent.email}</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/60">Навігація</p>
          <div className="mt-4 flex flex-col gap-3 text-base text-white/85">
            {footerNavLinks.map((item) => {
              const href = normalizeHomeAnchorHref(item.href);
              if (isHomeAnchorHref(item.href)) {
                return (
                  <a key={item.label} href={href} className="transition hover:text-white">
                    {item.label}
                  </a>
                );
              }
              return (
                <Link key={item.label} href={href} className="transition hover:text-white">
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/60">Документи</p>
          <div className="mt-4 flex flex-col gap-3 text-base text-white/85">
            {footerDocLinks.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/60">Соцмережі</p>
          <div className="mt-4 flex flex-col gap-3 text-base text-white/85">
            {footerSocialLinks.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}