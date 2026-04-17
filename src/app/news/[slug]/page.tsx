import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getCmsContent } from "@/lib/cms-content";
import { formatDateUk, getDateSortValue } from "@/lib/date-format";

export const generateStaticParams = async () => {
  const cms = await getCmsContent();

  return cms.newsItems.map((newsItem) => ({
    slug: newsItem.slug,
  }));
};

export const generateMetadata = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const cms = await getCmsContent();
  const { slug } = await params;
  const newsItem = cms.newsItems.find((item) => item.slug === slug);

  if (!newsItem) {
    return {
      title: "Новина не знайдена",
      description: "Вибачте, новина не знайдена.",
    };
  }

  return {
    title: `${newsItem.title} | Football Club`,
    description: newsItem.excerpt,
  };
};

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const cms = await getCmsContent();
  const { slug } = await params;
  const newsItem = cms.newsItems.find((item) => item.slug === slug);

  if (!newsItem) {
    notFound();
  }

  const otherNews = cms.newsItems
    .filter((item) => item.id !== newsItem.id)
    .sort((a, b) => getDateSortValue(b.date) - getDateSortValue(a.date))
    .slice(0, 3);

  const formattedNewsDate = formatDateUk(newsItem.date);

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        {/* Breadcrumb + Hero Section */}
        <section className="section-block mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
          <Link href="/news" className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--green-700)] transition hover:text-[var(--green-800)]">
            ← Назад до новин
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            {/* Main Content */}
            <article>
              <div className="overflow-hidden rounded-[28px] border border-[var(--blue-100)] shadow-[0_16px_40px_rgba(8,26,51,0.1)]">
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${newsItem.image})` }}
                />
                <div className="p-8 sm:p-10">
                  <h1 className="font-display text-3xl font-bold text-[var(--blue-950)] sm:text-4xl">{newsItem.title}</h1>
                  <div className="mt-6 flex items-center gap-4 border-b border-[var(--blue-100)] pb-6">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Опубліковано</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--blue-950)]">{formattedNewsDate}</p>
                    </div>
                  </div>

                  <div
                    className="prose prose-sm mt-8 max-w-2xl text-slate-700 sm:prose-base"
                    dangerouslySetInnerHTML={{ __html: newsItem.content }}
                  />
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-[100px] lg:h-fit">
              {/* Info Card */}
              <div className="rounded-[24px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">Про новину</p>
                <div className="mt-4 space-y-4 text-sm">
                  <div>
                    <p className="font-semibold text-[var(--blue-950)]">Дата публікації</p>
                    <p className="mt-1 text-slate-600">{formattedNewsDate}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--blue-950)]">Категорія</p>
                    <p className="mt-1 text-slate-600">Оновлення сервісу</p>
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              {otherNews.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--blue-950)]">Рекомендуємо</p>
                  <div className="mt-4 space-y-3">
                    {otherNews.map((relatedNewsItem) => (
                      <Link
                        key={relatedNewsItem.id}
                        href={`/news/${relatedNewsItem.slug}`}
                        className="group block rounded-[16px] border border-[var(--blue-100)] bg-white p-3 transition hover:border-[var(--green-700)] hover:shadow-[0_8px_20px_rgba(8,26,51,0.12)]"
                      >
                        <p className="line-clamp-2 text-xs font-bold text-[var(--blue-950)] transition group-hover:text-[var(--green-700)]">
                          {relatedNewsItem.title}
                        </p>
                        <p className="mt-2 text-[10px] text-slate-500">{formatDateUk(relatedNewsItem.date)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>

        {/* Related news section */}
        {otherNews.length > 0 && (
          <section className="section-bg-alt">
            <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
              <div className="mb-10">
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Рекомендуємо</p>
                <h2 className="mt-2 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                  Інші новини
                </h2>
              </div>

              <div className="grid gap-8 md:grid-cols-3">
                {otherNews.map((relatedNewsItem, index) => (
                  <article
                    key={relatedNewsItem.id}
                    className="animate-rise overflow-hidden rounded-[24px] border border-[var(--blue-100)] bg-white shadow-[0_12px_32px_rgba(8,26,51,0.08)]"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <Link href={`/news/${relatedNewsItem.slug}`} className="group relative block overflow-hidden">
                      <div
                        className="relative aspect-video bg-cover bg-center transition duration-300 group-hover:scale-105"
                        style={{ backgroundImage: `url(${relatedNewsItem.image})` }}
                      />
                    </Link>

                    <div className="p-4 sm:p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{formatDateUk(relatedNewsItem.date)}</p>
                      <Link href={`/news/${relatedNewsItem.slug}`}>
                        <h3 className="mt-2 text-lg font-bold text-[var(--blue-950)] transition hover:text-[var(--green-700)] sm:text-xl">
                          {relatedNewsItem.title}
                        </h3>
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-600">{relatedNewsItem.excerpt}</p>
                      <Link
                        href={`/news/${relatedNewsItem.slug}`}
                        className="mt-3 inline-flex text-sm font-semibold text-[var(--green-700)] transition hover:text-[var(--green-800)]"
                      >
                        Прочитати →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter
        footerNavLinks={cms.footerNavLinks}
        footerDocLinks={cms.footerDocLinks}
        footerSocialLinks={cms.footerSocialLinks}
      />
    </>
  );
}
