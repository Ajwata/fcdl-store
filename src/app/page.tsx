import Link from "next/link";

import { HomeBookingInteractive } from "@/components/booking/home-booking-interactive";
import { HeroCarousel } from "@/components/hero-carousel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatsSection } from "@/components/stats-section";
import {
  galleryItems,
  heroSlides,
  newsItems,
  testimonials,
} from "@/data/site-content";

export default function Home() {
  const averageRating = (
    testimonials.reduce((sum, review) => sum + Number(review.rating), 0) / testimonials.length
  ).toFixed(1);
  const averageStars = Math.floor(Number(averageRating));
  const totalReviews = testimonials.length;

  const ratingScale = [
    { label: "5.0", percent: 92 },
    { label: "4.0", percent: 8 },
    { label: "3.0", percent: 0 },
    { label: "2.0", percent: 0 },
    { label: "1.0", percent: 0 },
  ];

  return (
    <>
      <SiteHeader />
      <main className="page-shell flex-1">
        <HeroCarousel slides={heroSlides} />

        <section id="overview" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <article className="panel-card animate-rise overflow-hidden bg-[var(--blue-950)] text-white">
            <div className="relative">
              <div className="absolute -right-14 -top-14 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-20 -left-8 h-44 w-44 rounded-full bg-[var(--green-700)]/30 blur-2xl" />

              <div className="relative z-10">
                <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-white/85">
                  UX-first підхід
                </span>

                <h2 className="mt-5 font-display text-5xl uppercase leading-[0.92] sm:text-6xl">
                  Бронювання
                  <br />
                  без зайвих кроків
                </h2>

                <p className="mt-5 max-w-xl text-base leading-7 text-white/80">
                  Користувач одразу бачить шлях: сектор, дата, час, кошик. Мінімум кліків, максимум зрозумілості.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Крок 1</p>
                    <p className="mt-2 text-sm font-semibold">Обрати сектор</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Крок 2</p>
                    <p className="mt-2 text-sm font-semibold">Обрати дату і час</p>
                  </div>
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Крок 3</p>
                    <p className="mt-2 text-sm font-semibold">Додати у кошик</p>
                  </div>
                </div>

                <Link
                  href="#booking"
                  className="cta-primary mt-7 inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
                >
                  Спробувати бронювання
                </Link>
              </div>
            </div>
          </article>

          <div className="animate-rise self-center px-2" style={{ animationDelay: "140ms" }}>
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--green-700)]">Просто і швидко</p>
            <h3 className="mt-3 text-3xl font-black text-[var(--blue-950)] sm:text-4xl">
              Обери сектор, час і підтвердь бронювання за 1 хвилину
            </h3>
            <p className="mt-4 max-w-xl text-lg leading-8 text-slate-700">
              Інтерфейс зроблений так, щоб гравець не губився: логічна послідовність дій, прозора ціна та зрозумілий кошик.
            </p>
          </div>
        </div>
        </section>

        <HomeBookingInteractive />

        <section id="gallery" className="section-bg-media">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-200)]">Галерея</p>
                <h2 className="mt-3 font-display text-5xl uppercase leading-none text-white">
                  Реальний настрій поля
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-white/55">
                Атмосфера матчів, зона поля та фотозвіти з ігор на одній сторінці.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="gallery-card animate-rise lg:min-h-[520px]">
                <div
                  className="gallery-photo"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.12), rgba(8,26,51,0.58)), url(${galleryItems[0].image})` }}
                />
                <div className="gallery-copy">
                  <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/65">Головний кадр</p>
                  <h3 className="mt-3 text-4xl font-black text-white">{galleryItems[0].title}</h3>
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
                        <h3 className="text-2xl font-black text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-white/78">{item.caption}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Link href="#" className="ui-link text-sm font-extrabold uppercase tracking-[0.14em] !text-white">
                    Дивитися все
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cameras" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="live-panel animate-rise">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Камери</p>
              <h2 className="mt-4 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">
                Дивіться онлайн трансляції матчів
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                На головній показуємо одну актуальну трансляцію, а всі інші ракурси та архів матчів доступні на окремій сторінці камер.
              </p>
              <div className="live-video-shell mt-8">
                <div className="live-video-placeholder">
                  <span className="play-pulse" />
                  <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/70">Онлайн перегляд</p>
                  <p className="mt-2 text-2xl font-black text-white">Пряма трансляція матчу</p>
                </div>
              </div>
            </article>

            <div className="grid gap-5">
              <article className="panel-card animate-rise overflow-hidden bg-[var(--blue-950)] text-white" style={{ animationDelay: "220ms" }}>
                <div className="relative">
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/8 blur-2xl" />
                  <div className="absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-[var(--green-700)]/25 blur-2xl" />

                  <div className="relative z-10">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/68">
                      <span className="h-2 w-2 rounded-full bg-[#ff5f5f] shadow-[0_0_12px_rgba(255,95,95,0.9)]" />
                      Інші ракурси
                    </span>

                    <h3 className="mt-5 text-3xl font-black leading-tight text-white">
                      Всі додаткові камери дивіться на окремій сторінці
                    </h3>

                    <p className="mt-4 text-base leading-7 text-white/72">
                      Там будуть доступні інші ракурси, швидке перемикання між камерами та повний перегляд усіх трансляцій в одному місці.
                    </p>

                    <div className="mt-6 rounded-[24px] border border-white/12 bg-white/6 p-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#164a2e_0%,#123120_100%)] p-3">
                          <div className="relative flex h-20 items-center justify-center rounded-[12px] border border-white/10 bg-white/8">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/14 backdrop-blur-sm">
                              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                            </span>
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#10345f_0%,#0d223e_100%)] p-3">
                          <div className="relative flex h-20 items-center justify-center rounded-[12px] border border-white/10 bg-white/8">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/14 backdrop-blur-sm">
                              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                            </span>
                          </div>
                        </div>
                        <div className="rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#1f4f90_0%,#122f5b_46%,#0d1e3a_100%)] p-3">
                          <div className="relative flex h-20 items-center justify-center rounded-[12px] border border-white/10 bg-white/8">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/16 bg-white/14 backdrop-blur-sm">
                              <span className="ml-0.5 h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <a
                      href="#"
                      className="cta-secondary mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-[var(--blue-950)] transition hover:bg-[var(--blue-50)]"
                    >
                      Перейти до всіх камер
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <StatsSection />

        <section id="reviews" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <aside className="panel-card animate-rise bg-[var(--blue-950)] text-white">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-200)]">Відгуки</p>
              <h2 className="mt-4 font-display text-5xl uppercase leading-none">Рейтинг сервісу</h2>

              <div className="mt-6 rounded-[26px] border border-white/14 bg-white/8 p-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/58">Середня оцінка</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className="font-display text-7xl leading-none">{averageRating}</p>
                  <p className="mb-2 text-xl font-black text-white/62">/ 5</p>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < averageStars ? "text-lg text-[var(--green-200)]" : "text-lg text-white/26"}>
                      ★
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-sm text-white/62">На основі оцінок гравців і команд</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-white/42">{totalReviews} відгуки(ів)</p>
              </div>

              <div className="mt-6 space-y-3">
                {ratingScale.map((item) => (
                  <div key={item.label} className="grid grid-cols-[44px_1fr_42px] items-center gap-3">
                    <span className="text-sm font-black text-white/82">{item.label}</span>
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
                href="#booking"
                className="cta-primary mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
              >
                Залиши відгук
              </Link>
            </aside>

            <div className="grid gap-4">
              <div className="flex items-end justify-between gap-3 px-1">
                <h3 className="text-2xl font-black text-[var(--blue-950)]">Відгуки клієнтів</h3>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Реальні коментарі</p>
              </div>

              {testimonials.map((review, index) => (
                <article
                  key={review.name}
                  className="panel-card animate-rise bg-white/92"
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[var(--green-700)]">Відгук клієнта</p>
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
                    <p className="text-sm font-black uppercase tracking-[0.14em] text-[var(--blue-950)]">{review.name.split(",")[0]}</p>
                    <p className="text-sm font-extrabold text-[var(--blue-700)]">{review.rating} / 5</p>
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
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Новини</p>
                <h2 className="mt-3 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">Останні оновлення</h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                  Актуальні анонси, зміни розкладу та важливі апдейти по матчах і сервісу.
                </p>
              </div>
              <Link
                href="#"
                className="cta-secondary inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--blue-800)]"
              >
                Усі новини
              </Link>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="relative overflow-hidden rounded-[30px] border border-[var(--blue-100)] shadow-[0_20px_60px_rgba(8,26,51,0.12)] min-h-[420px]">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.08), rgba(8,26,51,0.7)), url(${newsItems[0].image})` }}
                />
                <div className="relative z-10 flex h-full flex-col justify-end p-7 sm:p-8">
                  <p className="inline-flex w-fit rounded-full border border-white/28 bg-white/12 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.14em] text-white/82">
                    Головна новина
                  </p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-100)]">{newsItems[0].date}</p>
                  <h3 className="mt-3 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl">{newsItems[0].title}</h3>
                </div>
              </article>

              <div className="grid gap-5">
                {newsItems.slice(1).map((news) => (
                  <article key={news.id} className="panel-card overflow-hidden bg-white p-0 transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(8,26,51,0.14)]">
                    <div className="h-44 w-full bg-center bg-cover" style={{ backgroundImage: `url(${news.image})` }} />
                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">{news.date}</p>
                      <h3 className="mt-3 text-xl font-black leading-snug text-[var(--blue-950)]">{news.title}</h3>
                      <div className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] text-[var(--blue-700)]">
                        Детальніше
                        <span aria-hidden>→</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
