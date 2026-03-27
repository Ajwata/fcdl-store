import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  galleryItems,
  heroHighlights,
  heroStats,
  landingFeatures,
  liveFeatures,
  sectors,
  testimonials,
} from "@/data/site-content";

export default function Home() {

  const featureIcons = [
    (
      <svg
        key="feature-icon-calendar"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="feature-icon-svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="16" rx="4" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M3 10h18" />
        <circle cx="12" cy="15" r="2" />
      </svg>
    ),
    (
      <svg
        key="feature-icon-pricing"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="feature-icon-svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3Z" />
        <path d="M9 9.6h6" />
        <path d="M9 12.2h4" />
        <path d="M9 14.8h3" />
      </svg>
    ),
    (
      <svg
        key="feature-icon-control"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="feature-icon-svg"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4l-3.4 3-3.1-3H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8.5 9.5h7" />
        <path d="M8.5 12.5h4.5" />
      </svg>
    ),
  ];

  return (
    <>
      <SiteHeader />
      <main className="page-shell flex-1">
      <section className="hero-section">
        <div className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl gap-12 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <div className="flex flex-col justify-between gap-10">
            <div className="space-y-7">
              <div className="flex flex-wrap gap-3 text-sm font-semibold text-[var(--blue-900)]">
                {heroHighlights.map((item) => (
                  <span
                    key={item}
                    className="animate-rise rounded-full border border-white/70 bg-white/70 px-4 py-2 backdrop-blur-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="animate-rise space-y-5" style={{ animationDelay: "120ms" }}>
                <p className="text-sm font-bold uppercase tracking-[0.35em] text-[var(--green-700)]">
                  Поле, розклад, матчі
                </p>
                <h1 className="max-w-3xl font-display text-6xl uppercase leading-[0.9] text-[var(--blue-950)] sm:text-7xl lg:text-8xl">
                  Поле, яке бронюється за кілька дотиків
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                  Сучасний сервіс оренди футбольного поля: зрозумілий розклад, швидкий вибір сектора і
                  прозора вартість без дзвінків та плутанини.
                </p>
              </div>

              <div className="animate-rise flex flex-col gap-4 sm:flex-row" style={{ animationDelay: "220ms" }}>
                <Link
                  href="/booking"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--blue-900)] px-7 py-4 text-base font-bold !text-white transition hover:bg-[var(--blue-800)] hover:!text-white"
                >
                  Відкрити бронювання
                </Link>
                <a
                  href="#overview"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--green-800)] bg-[var(--green-700)] px-7 py-4 text-base font-bold !text-white transition hover:bg-[var(--green-800)] hover:!text-white"
                >
                  Переглянути поле
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {heroStats.map((stat, index) => (
                <article
                  key={stat.label}
                  className="stat-card animate-rise"
                  style={{ animationDelay: `${300 + index * 90}ms` }}
                >
                  <span className="stat-value">{stat.value}</span>
                  <span className="stat-label">{stat.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <div className="hero-visual animate-rise" style={{ animationDelay: "200ms" }}>
              <div className="pitch-card" aria-hidden="true">
                <div className="pitch-lines">
                  <span className="pitch-divider vertical" />
                  <span className="pitch-divider horizontal" />
                  <span className="pitch-circle" />
                  <span className="goal-box left" />
                  <span className="goal-box right" />
                </div>
                <div className="pitch-copy">
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/70">
                    Live booking
                  </p>
                  <h2 className="font-display text-5xl uppercase text-white">
                    Темно-зелене серце проєкту
                  </h2>
                  <p className="max-w-sm text-base leading-7 text-white/80">
                    Візуально поле лишається головним акцентом: окремі сектори, доступний час і бронювання
                    всього поля в одному екрані.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="panel-card animate-rise bg-[var(--blue-950)] text-white">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-white/60">FCDL.STORE</p>
            <h2 className="mt-4 font-display text-5xl uppercase leading-none">Поле для твоєї команди щодня</h2>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              Швидке бронювання, зручний розклад і прозорі тарифи для тренувань, товариських матчів та турнірів.
            </p>
          </article>

          <div className="grid gap-6 md:grid-cols-3">
            {landingFeatures.map((feature, index) => (
              <article
                key={feature.title}
                className="panel-card animate-rise bg-white/90"
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <div className="feature-icon-wrap mb-5">{featureIcons[index]}</div>
                <h3 className="text-xl font-extrabold text-[var(--blue-950)]">{feature.title}</h3>
                <p className="mt-3 text-base leading-7 text-slate-600">{feature.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Галерея</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">
              Реальний настрій поля
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-slate-600">
            Фотогалерея поля, ігрових зон та атмосфери матчів у будь-який час доби.
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
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Відгуки</p>
            <h2 className="mt-3 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">
              Що кажуть команди після матчу
            </h2>
          </div>
          <Link href="/booking" className="text-sm font-extrabold uppercase tracking-[0.16em] text-[var(--blue-700)]">
            Перейти до бронювання
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {testimonials.map((review, index) => (
            <article
              key={review.name}
              className="panel-card animate-rise flex h-full flex-col bg-white/92"
              style={{ animationDelay: `${100 + index * 90}ms` }}
            >
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-[var(--green-700)]">Оцінка {review.rating}</p>
              <p className="mt-5 flex-1 text-lg leading-8 text-slate-700">“{review.text}”</p>
              <p className="mt-8 text-sm font-black uppercase tracking-[0.14em] text-[var(--blue-950)]">{review.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="live" className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="live-panel animate-rise">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">Онлайн-трансляція</p>
            <h2 className="mt-4 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">
              Дивись матчі онлайн у прямому ефірі
            </h2>
            <div className="live-video-shell mt-8">
              <div className="live-video-placeholder">
                <span className="play-pulse" />
                <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-white/70">YouTube live</p>
                <p className="mt-2 text-2xl font-black text-white">Прямий ефір матчів FCDL</p>
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            <article className="panel-card animate-rise bg-white/92" style={{ animationDelay: "120ms" }}>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--blue-700)]">Лічильник матчів</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] bg-[var(--blue-50)] p-5">
                  <p className="font-display text-6xl uppercase text-[var(--blue-950)]">1280</p>
                  <p className="text-sm font-semibold text-slate-600">матчів зіграно</p>
                </div>
                <div className="rounded-[24px] bg-[var(--green-100)] p-5">
                  <p className="font-display text-6xl uppercase text-[var(--green-800)]">94%</p>
                  <p className="text-sm font-semibold text-slate-600">повторних бронювань</p>
                </div>
              </div>
            </article>

            <article className="panel-card animate-rise bg-[var(--blue-950)] text-white" style={{ animationDelay: "220ms" }}>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Переваги платформи</p>
              <div className="mt-5 space-y-4">
                {liveFeatures.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--green-100)]" />
                    <p className="text-base leading-7 text-white/78">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="booking" className="mx-auto max-w-7xl px-6 pb-16 lg:px-10 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            {sectors.map((sector, index) => (
              <article key={sector.name} className="sector-card animate-rise" style={{ animationDelay: `${80 + index * 70}ms` }}>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Сектор</p>
                <h3 className="mt-3 text-3xl font-black text-[var(--blue-950)]">{sector.name}</h3>
                <p className="mt-2 text-lg font-semibold text-[var(--blue-700)]">{sector.price}</p>
                <p className="mt-6 text-sm leading-6 text-slate-600">{sector.status}</p>
              </article>
            ))}
          </div>

          <aside className="booking-card animate-rise" style={{ animationDelay: "180ms" }}>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--blue-700)]">Швидке бронювання</p>
            <h2 className="mt-4 font-display text-5xl uppercase leading-none text-[var(--blue-950)]">
              Швидкий старт бронювання
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Обирай дату, час і формат гри за хвилину та переходь до підтвердження броні.
            </p>

            <div className="mt-8 grid gap-4">
              <div className="input-shell">
                <span>Дата</span>
                <strong>Субота, 29 березня</strong>
              </div>
              <div className="input-shell">
                <span>Час</span>
                <strong>18:00 - 19:00</strong>
              </div>
              <div className="input-shell">
                <span>Зона</span>
                <strong>Усе поле</strong>
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between gap-4 border-t border-slate-200 pt-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">Вартість</p>
                <p className="mt-2 text-4xl font-black text-[var(--blue-950)]">2500 грн</p>
              </div>
              <Link
                href="/booking"
                className="rounded-full bg-[var(--green-700)] px-6 py-4 text-sm font-extrabold uppercase tracking-[0.15em] !text-white transition hover:bg-[var(--green-800)] hover:!text-white"
              >
                Бронювати
              </Link>
            </div>
          </aside>
        </div>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}
