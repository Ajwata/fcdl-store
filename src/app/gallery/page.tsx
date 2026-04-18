import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { getCmsContent } from "@/lib/cms-content";

export const metadata = {
  title: "Галерея | Football Club",
  description: "Фото матчів, атмосфери поля та тренувань Football Club",
};

export default async function GalleryPage() {
  const cms = await getCmsContent();

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        <section className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Галерея</p>
              <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                Реальний настрій поля
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Фото з матчів та тренувань: жива атмосфера, ігрові емоції та моменти команди.
              </p>
            </div>

            <Link
              href="/#booking"
              className="inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
            >
              Забронювати поле
            </Link>
          </div>

          <GalleryLightbox items={cms.galleryItems} />
        </section>
      </main>
      <SiteFooter
        footerNavLinks={cms.footerNavLinks}
        footerDocLinks={cms.footerDocLinks}
        footerSocialLinks={cms.footerSocialLinks}
        footerContent={cms.footerContent}
        logoUrl={cms.logoUrl}
        siteName={cms.siteName}
      />
    </>
  );
}
