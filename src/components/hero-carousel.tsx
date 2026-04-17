"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
  videoUrl: string;
  heroMode?: "video" | "slides";
  heroBadge?: string;
};

function getVideoMimeType(url: string): string | undefined {
  const cleanUrl = url.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUrl.endsWith(".mp4")) return "video/mp4";
  if (cleanUrl.endsWith(".webm")) return "video/webm";
  if (cleanUrl.endsWith(".ogg") || cleanUrl.endsWith(".ogv")) return "video/ogg";
  if (cleanUrl.endsWith(".mov")) return "video/quicktime";
  return undefined;
}

export function HeroCarousel({ slides, videoUrl, heroMode = "video", heroBadge = "Онлайн-бронювання поля" }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (heroMode !== "slides" || slides.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroMode, slides.length]);

  if (slides.length === 0) {
    return null;
  }

  if (heroMode === "slides") {
    const activeSlide = slides[activeIndex] ?? slides[0];
    return (
      <section className="relative min-h-screen overflow-hidden pt-[76px]">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.3) 0%, rgba(8,26,51,0.72) 100%), url(${slide.image})`,
              opacity: index === activeIndex ? 1 : 0,
            }}
          />
        ))}

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-end px-6 pb-14 sm:pb-18 lg:px-10 lg:pb-22">
          <div className="max-w-3xl rounded-[24px] border border-white/25 bg-white/10 p-6 backdrop-blur-md sm:p-8 lg:max-w-[52rem] lg:p-6">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--green-100)]">{heroBadge}</p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.92] text-white sm:text-6xl lg:text-[50px] lg:leading-[1] lg:tracking-[0.035em]">
              {activeSlide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{activeSlide.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#booking"
                className="inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-7 py-4 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
              >
                {activeSlide.cta}
              </Link>
              {slides.length > 1 && (
                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      className={`h-2 rounded-full transition-all ${i === activeIndex ? "w-8 bg-white" : "w-2 bg-white/40"}`}
                      aria-label={`Слайд ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {slides.length > 1 && (
            <div className="absolute right-6 top-1/2 flex -translate-y-1/2 flex-col gap-3 lg:right-10">
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25"
                aria-label="Попередній"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25"
                aria-label="Наступний"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Default: video mode
  const mainSlide = slides[0];
  const resolvedVideoUrl = videoUrl || "/img/background.mp4";
  const videoType = getVideoMimeType(resolvedVideoUrl);
  const titleWords = mainSlide.title.trim().split(/\s+/);
  const desktopFirstLine = titleWords.slice(0, Math.max(1, titleWords.length - 2)).join(" ");
  const desktopSecondLine = titleWords.slice(Math.max(1, titleWords.length - 2)).join(" ");
  const desktopFirstLineParts = desktopFirstLine.split(/(онлайн)/iu);

  useEffect(() => {
    setVideoFailed(false);
  }, [resolvedVideoUrl]);

  return (
    <section className="relative min-h-screen overflow-hidden pt-[76px]">
      <div
        className="absolute inset-0 hidden bg-cover bg-center md:block"
        style={{ backgroundImage: `url(${mainSlide.image})` }}
      />
      <video
        key={resolvedVideoUrl}
        className={`absolute inset-0 hidden h-full w-full object-cover md:block ${videoFailed ? "opacity-0" : "opacity-100"}`}
        autoPlay
        muted
        loop
        playsInline
        onError={() => setVideoFailed(true)}
      >
        <source src={resolvedVideoUrl} type={videoType} />
      </video>
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: `url(${mainSlide.image})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,51,0.32)_0%,rgba(8,26,51,0.64)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-end px-6 pb-14 sm:pb-18 lg:px-10 lg:pb-22">
        <div className="max-w-3xl rounded-[24px] border border-white/25 bg-white/10 p-6 backdrop-blur-md sm:p-8 lg:max-w-[52rem] lg:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--green-100)]">{heroBadge}</p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.92] text-white sm:text-6xl lg:text-[50px] lg:leading-[1] lg:tracking-[0.035em]">
            <span className="lg:hidden">{mainSlide.title}</span>
            <span className="hidden lg:block">
              {desktopFirstLineParts.map((part, index) =>
                /онлайн/iu.test(part) ? (
                  <span key={`online-${index}`} className="text-[#2a8a4c]">
                    {part}
                  </span>
                ) : (
                  <span key={`part-${index}`}>{part}</span>
                ),
              )}
              <span className="block">{desktopSecondLine}</span>
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{mainSlide.subtitle}</p>
          <Link
            href="#booking"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-7 py-4 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
          >
            {mainSlide.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}