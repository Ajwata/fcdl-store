import Image from "next/image";
import Link from "next/link";

import { footerDocLinks, footerNavLinks, footerSocialLinks } from "@/data/site-content";
import logoImage from "@/img/logo.jpg";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/40 bg-[var(--blue-950)] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.8fr_0.8fr_0.8fr] lg:px-10">
        <div>
          <Image src={logoImage} alt="FCDL.STORE" className="h-12 w-auto rounded-md object-cover sm:h-14 lg:h-16" />
          <p className="mt-4 max-w-md text-base leading-7 text-white/72">
            Сервіс для бронювання футбольного поля, керування матчами та зручної комунікації з клієнтами.
          </p>
          <div className="mt-5 space-y-2 text-sm text-white/82">
            <p>м. Київ, спортивний кластер FCDL</p>
            <p>+380 67 000 00 00</p>
            <p>hello@fcdl.store</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/60">Навігація</p>
          <div className="mt-4 flex flex-col gap-3 text-base text-white/85">
            {footerNavLinks.map((item) => (
              <Link key={item.label} href={item.href} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
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