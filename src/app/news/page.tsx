import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCmsContent } from "@/lib/cms-content";

export const metadata = {
  title: "Новини | Football Club",
  description: "Останні новини про матчі, турніри й оновлення сервісу",
};

export default async function NewsPage() {
  const cms = await getCmsContent();
  const { newsItems } = cms;

  const sortedNews = [...newsItems].sort((a, b) => {
    const dateA = new Date(a.date.replace(/\s+/, ""));
    const dateB = new Date(b.date.replace(/\s+/, ""));
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        <section className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Головна</p>
              <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                Усі новини
              </h1>
            </div>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Слідкуйте за останніми оновленнями про матчі, турніри й зміни сервісу.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:gap-10">
            {sortedNews.map((newsItem, index) => (
              <article
                key={newsItem.id}
                className="animate-rise overflow-hidden rounded-[26px] border border-[var(--blue-100)] shadow-[0_16px_40px_rgba(8,26,51,0.1)]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Link href={`/news/${newsItem.slug}`} className="group relative block overflow-hidden">
                  <div
                    className="relative aspect-video bg-cover bg-center transition duration-300 group-hover:scale-105"
                    style={{ backgroundImage: `url(${newsItem.image})` }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,51,0)_0%,rgba(8,26,51,0.72)_100%)]" />
                </Link>

                <div className="p-6 sm:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{newsItem.date}</p>
                  <Link href={`/news/${newsItem.slug}`}>
                    <h2 className="mt-3 text-2xl font-bold text-[var(--blue-950)] transition hover:text-[var(--green-700)] sm:text-3xl">
                      {newsItem.title}
                    </h2>
                  </Link>
                  <p className="mt-3 leading-7 text-slate-600">{newsItem.excerpt}</p>
                  <Link
                    href={`/news/${newsItem.slug}`}
                    className="mt-5 inline-flex items-center justify-center rounded-full border border-[var(--green-700)] bg-[var(--green-100)] px-5 py-2 text-sm font-semibold text-[var(--green-800)] transition hover:bg-[var(--green-200)]"
                  >
                    Прочитати далі
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter
        footerNavLinks={cms.footerNavLinks}
        footerDocLinks={cms.footerDocLinks}
        footerSocialLinks={cms.footerSocialLinks}
      />
    </>
  );
}
