import Link from "next/link";

import { AdminContactsSection } from "@/components/admin-contacts-section";
import { HomeBookingInteractive } from "@/components/booking/home-booking-interactive";
import { HeroCarousel } from "@/components/hero-carousel";
import { LiveStreams } from "@/components/live-streams";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsSection } from "@/components/stats-section";
import { HashScrollLink } from "@/components/ui/hash-scroll-link";
import type { StatItem } from "@/data/cms-defaults";
import { getBookings } from "@/lib/bookings";
import { getAllClientUsers } from "@/lib/client-auth";
import { getCmsContent } from "@/lib/cms-content";
import { getPublicClientReviews } from "@/lib/client-engagement";
import { formatDateUk, getDateSortValue } from "@/lib/date-format";

export const dynamic = "force-dynamic";

function resolveLiveStatValue(item: StatItem, stats: { bookingsCount: number; clientsCount: number; averageRating: number }): number {
  const label = item.label.toLowerCase();
  if (label.includes("брон")) return stats.bookingsCount;
  if (label.includes("клієн") || label.includes("грав")) return stats.clientsCount;
  if (label.includes("рейтинг") || label.includes("оцін")) return stats.averageRating;
  return item.targetValue;
}

export default async function Home() {
  const [cms, bookings, users, allReviews] = await Promise.all([
    getCmsContent(),
    getBookings(),
    getAllClientUsers(),
    getPublicClientReviews(),
  ]);
  const { galleryItems, heroSlides, newsItems } = cms;
  const latestReviews = allReviews.slice(0, 3);

  const totalReviews = allReviews.length;
  const averageRatingNumber = totalReviews > 0
    ? allReviews.reduce((sum, review) => sum + Number(review.rating), 0) / totalReviews
    : 0;
  const averageRating = averageRatingNumber.toFixed(1);
  const averageStars = Math.floor(averageRatingNumber);

  const nonCancelledBookings = bookings.filter((booking) => booking.status !== "cancelled");
  const bookingsCount = nonCancelledBookings.length;
  const uniquePhones = new Set<string>();
  nonCancelledBookings.forEach((booking) => uniquePhones.add(booking.clientPhone.replace(/\D/g, "")));
  users.forEach((user) => uniquePhones.add(user.phone.replace(/\D/g, "")));
  const clientsCount = uniquePhones.size;

  const liveStats = {
    bookingsCount,
    clientsCount,
    averageRating: Number(averageRating),
  };

  const statsItems = cms.statsSection.items.map((item) => ({
    ...item,
    targetValue: resolveLiveStatValue(item, liveStats),
  }));

  const ratingScale = [5, 4, 3, 2, 1].map((rating) => {
    const count = allReviews.filter((item) => Math.round(item.rating) === rating).length;
    const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { label: `${rating}.0`, percent };
  });

  const promoOffers = cms.promoOffers;

  const sortedNews = [...newsItems].sort((a, b) => getDateSortValue(b.date) - getDateSortValue(a.date));
  const featuredNews = sortedNews[0];
  const secondaryNews = sortedNews.slice(1, 4);

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} logoUrl={cms.logoUrl} siteName={cms.siteName} />
      <main className="page-shell flex-1">
        <HeroCarousel slides={heroSlides} videoUrl={cms.heroVideoUrl} heroMode={cms.heroMode} heroBadge={cms.heroBadge} />

        <HomeBookingInteractive bookingSection={cms.bookingSection} />

        <section id="gallery" className="section-bg-media">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-200)]">{cms.homeGallerySection.badge}</p>
                <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-white sm:text-5xl">
                  {cms.homeGallerySection.title}
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-white/55">
                {cms.homeGallerySection.description}
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="gallery-card animate-rise lg:min-h-[520px]">
                <div
                  className="gallery-photo"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.12), rgba(8,26,51,0.58)), url(${galleryItems[0].image})` }}
                />
                <div className="gallery-copy">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/65">{cms.homeUiText.galleryMainLabel}</p>
                  <h3 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{galleryItems[0].title}</h3>
                  <p className="mt-3 max-w-lg text-base leading-7 text-white/78">{galleryItems[0].caption}</p>
                </div>
              </article>

              <div className="flex flex-col gap-4">
                <div className="grid gap-5 sm:grid-cols-2">
                  {galleryItems.slice(1).map((item, index) => (
                    <article key={item.title} className="gallery-card animate-rise" style={{ animationDelay: `${80 + index * 80}ms` }}>
                      <div
                        className="gallery-photo"
                        style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.12), rgba(8,26,51,0.58)), url(${item.image})` }}
                      />
                      <div className="gallery-copy">
                        <h3 className="text-2xl font-bold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/78">{item.caption}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Link href="/gallery" className="ui-link text-sm font-semibold uppercase tracking-[0.14em] !text-white">
                    {cms.homeGallerySection.ctaText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cameras" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <LiveStreams
            badge={cms.liveStreamsSection.badge}
            title={cms.liveStreamsSection.title}
            description={cms.liveStreamsSection.description}
            streams={cms.liveStreamsSection.streams}
          />
        </section>

        <section id="promotions" className="section-bg-alt">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">{cms.homePromotionsSection.badge}</p>
                <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                  {cms.homePromotionsSection.title}
                </h2>
              </div>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                {cms.homePromotionsSection.description}
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              {promoOffers[0] && (
                <article className="relative overflow-hidden rounded-[26px] border border-[var(--blue-100)] shadow-[0_18px_48px_rgba(8,26,51,0.1)] lg:min-h-[460px]">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.32), rgba(8,26,51,0.9)), url(${promoOffers[0].image})` }}
                  />
                  <div className="relative z-10 flex min-h-[360px] flex-col justify-end p-6 text-white sm:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="inline-flex rounded-full border border-white/35 bg-white/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/92">
                        {promoOffers[0].tag}
                      </p>
                      <p className="inline-flex rounded-full border border-[var(--green-200)]/70 bg-[var(--green-700)]/45 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--green-100)]">
                        {promoOffers[0].benefit}
                      </p>
                    </div>
                    <h3 className="mt-3 max-w-2xl text-3xl font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-4xl">{promoOffers[0].title}</h3>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-white/92 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">{promoOffers[0].description}</p>
                    <div className="mt-5 grid gap-1 text-sm text-white/90">
                      <p className="font-semibold text-[var(--green-100)]">{promoOffers[0].validUntil}</p>
                      <p className="text-white/78">{promoOffers[0].terms}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/72">{promoOffers[0].usedBy}</p>
                    </div>
                    <HashScrollLink
                      href={promoOffers[0].href}
                      className="mt-6 inline-flex w-fit items-center justify-center rounded-full bg-[var(--green-700)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
                    >
                      {promoOffers[0].cta}
                    </HashScrollLink>
                  </div>
                </article>
              )}

              <div className="grid gap-5">
                {promoOffers.slice(1).map((offer, index) => (
                  <article
                    key={offer.id}
                    className="relative overflow-hidden rounded-[24px] border border-[var(--blue-100)] shadow-[0_14px_34px_rgba(8,26,51,0.1)]"
                    style={{ animationDelay: `${80 + index * 90}ms` }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.3), rgba(8,26,51,0.88)), url(${offer.image})` }}
                    />
                    <div className="relative z-10 flex min-h-[220px] flex-col justify-end p-5 text-white">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--green-100)]">{offer.tag}</p>
                        <p className="rounded-full border border-[var(--green-200)]/65 bg-[var(--green-700)]/45 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--green-100)]">
                          {offer.benefit}
                        </p>
                      </div>
                      <h3 className="mt-2 text-xl font-bold leading-snug drop-shadow-[0_2px_7px_rgba(0,0,0,0.45)]">{offer.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/92 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">{offer.description}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/72">{offer.validUntil}</p>
                      <p className="mt-1 text-xs text-white/72">{offer.terms}</p>
                      <HashScrollLink
                        href={offer.href}
                        className="mt-4 inline-flex w-fit items-center justify-center rounded-full bg-[var(--green-700)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] !text-white transition hover:bg-[var(--green-800)]"
                      >
                        {offer.cta}
                      </HashScrollLink>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <StatsSection items={statsItems} badge={cms.statsSection.badge} title={cms.statsSection.title} description={cms.statsSection.description} />

        <section id="reviews" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <aside className="panel-card animate-rise bg-[var(--blue-950)] text-white">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-200)]">{cms.reviewsSection.badge}</p>
              <h2 className="mt-4 font-display text-4xl font-semibold uppercase leading-tight sm:text-5xl">{cms.reviewsSection.title}</h2>

              <div className="mt-6 rounded-[26px] border border-white/14 bg-white/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">{cms.homeUiText.reviewsAverageLabel}</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="font-display text-7xl leading-none">{averageRating}</p>
                  <p className="mb-2 text-xl font-bold text-white/62">/ 5</p>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < averageStars ? "text-lg text-[var(--green-200)]" : "text-lg text-white/26"}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm text-white/62">{cms.reviewsSection.ratingSubtitle}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/42">{totalReviews} відгуки(ів)</p>
              </div>

              <div className="mt-6 space-y-3">
                {ratingScale.map((item) => (
                  <div key={item.label} className="grid grid-cols-[44px_1fr_42px] items-center gap-3">
                    <span className="text-sm font-bold text-white/82">{item.label}</span>
                    <div className="h-2.5 rounded-full bg-white/12">
                      <div
                        className="h-full rounded-full bg-[var(--green-200)]"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                    <span className="text-right text-xs font-bold text-white/55">{item.percent}%</span>
                  </div>
                ))}
              </div>

              <Link
                href="/account/bookings"
                className="cta-primary mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
              >
                {cms.reviewsSection.ctaText}
              </Link>
            </aside>

            <div className="grid gap-4">
              <div className="flex items-end justify-between gap-3 px-1">
                <h3 className="text-2xl font-bold text-[var(--blue-950)]">{cms.reviewsSection.ratingTitle}</h3>
                <Link href="/reviews" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--blue-700)] hover:text-[var(--green-700)]">
                  {cms.reviewsSection.allReviewsCta}
                </Link>
              </div>

              {latestReviews.length === 0 ? (
                <article className="panel-card animate-rise bg-white/92">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--green-700)]">{cms.homeUiText.reviewsEmptyTitle}</p>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {cms.homeUiText.reviewsEmptyDescription}
                  </p>
                </article>
              ) : latestReviews.map((review, index) => (
                <article
                  key={review.id}
                  className="panel-card animate-rise bg-white/92"
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--green-700)]">{cms.homeUiText.reviewsCardLabel}</p>
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
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--blue-950)]">{review.clientName}</p>
                    <p className="text-sm font-semibold text-[var(--blue-700)]">{review.rating} / 5</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="news" className="section-bg-alt">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
            <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">{cms.homeNewsSection.badge}</p>
                <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">{cms.homeNewsSection.title}</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                  {cms.homeNewsSection.description}
                </p>
              </div>
              <Link
                href="/news"
                className="cta-secondary inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--blue-800)]"
              >
                {cms.homeNewsSection.allNewsCta}
              </Link>
            </div>

            <div className="grid gap-5">
              {featuredNews && (
                <Link href={`/news/${featuredNews.slug}`} className="block">
                  <article className="relative overflow-hidden rounded-[30px] border border-[var(--blue-100)] shadow-[0_20px_60px_rgba(8,26,51,0.12)] min-h-[420px] transition hover:shadow-[0_28px_80px_rgba(8,26,51,0.18)]">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.08), rgba(8,26,51,0.7)), url(${featuredNews.image})` }}
                    />
                    <div className="relative z-10 flex h-full flex-col justify-end p-7 sm:p-8">
                      <p className="inline-flex w-fit rounded-full border border-white/28 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white/82">
                        {cms.homeUiText.newsFeaturedLabel}
                      </p>
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-100)]">{formatDateUk(featuredNews.date)}</p>
                      <h3 className="mt-3 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">{featuredNews.title}</h3>
                    </div>
                  </article>
                </Link>
              )}

              <div className="grid gap-5 sm:grid-cols-3">
                {secondaryNews.map((news) => (
                  <Link key={news.id} href={`/news/${news.slug}`} className="block h-full">
                    <article className="panel-card overflow-hidden bg-white p-0 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(8,26,51,0.14)] flex flex-col h-full">
                      <div className="h-40 w-full flex-shrink-0 bg-center bg-cover" style={{ backgroundImage: `url(${news.image})` }} />
                      <div className="flex flex-1 flex-col p-5">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">{formatDateUk(news.date)}</p>
                        <h3 className="mt-3 text-lg font-bold leading-snug text-[var(--blue-950)]">{news.title}</h3>
                        <div className="mt-auto pt-4 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--blue-700)]">
                          {cms.homeUiText.newsReadMoreLabel}
                          <span aria-hidden>→</span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <AdminContactsSection contacts={cms.adminContacts} />
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
