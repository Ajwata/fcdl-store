import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCmsContent } from "@/lib/cms-content";
import { getPublicClientReviews } from "@/lib/client-engagement";
import { formatDateUk } from "@/lib/date-format";

export const metadata = {
  title: "Відгуки | Football Club",
  description: "Усі відгуки клієнтів після зіграних матчів",
};

export default async function ReviewsPage() {
  const [cms, reviews] = await Promise.all([
    getCmsContent(),
    getPublicClientReviews(),
  ]);

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        <section className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Відгуки</p>
              <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                Усі відгуки клієнтів
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-7 text-slate-600">
              Тут зібрані реальні відгуки клієнтів, які завершили матч і залишили оцінку у своєму кабінеті.
            </p>
          </div>

          {reviews.length === 0 ? (
            <div className="panel-card bg-white/92">
              <p className="text-base leading-7 text-slate-600">Відгуків поки немає. Перші відгуки з'являться після завершених матчів.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {reviews.map((review, index) => (
                <article
                  key={review.id}
                  className="panel-card animate-rise bg-white/92"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Після матчу</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < Math.floor(Number(review.rating)) ? "text-base text-[var(--green-700)]" : "text-base text-slate-300"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="mt-4 text-lg leading-8 text-slate-700">“{review.text}”</p>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--blue-100)] pt-4">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--blue-950)]">{review.clientName}</p>
                      <p className="text-xs text-slate-500">{review.bookingDate ? formatDateUk(review.bookingDate) : "Дата матчу"} · Поле {review.sector}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--blue-700)]">{review.rating} / 5</p>
                  </div>
                </article>
              ))}
            </div>
          )}
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
