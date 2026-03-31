"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
};

type HeroCarouselProps = {
  slides: HeroSlide[];
};

const AUTOPLAY_MS = 6000;

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const timerId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timerId);
  }, [slides.length]);

  if (slides.length === 0) {
    return null;
  }

  const currentSlide = slides[activeIndex];

  return (
    <section className="relative min-h-screen overflow-hidden pt-[76px]">
      {slides.map((slide, index) => {
        const active = index === activeIndex;

        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}
            aria-hidden={!active}
          >
            <div
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${slide.image})` }}
            />
            <div className="absolute inset-0 bg-[rgba(8,26,51,0.52)]" />
          </div>
        );
      })}

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-end px-6 pb-14 sm:pb-18 lg:px-10 lg:pb-22">
        <div className="max-w-3xl rounded-[24px] border border-white/25 bg-white/10 p-6 backdrop-blur-md sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--green-100)]">Онлайн-бронювання поля</p>
          <h1 className="mt-4 font-display text-5xl uppercase leading-[0.92] text-white sm:text-6xl lg:text-7xl">
            {currentSlide.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/85 sm:text-lg">{currentSlide.subtitle}</p>
          <Link
            href="#booking"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-7 py-4 text-sm font-extrabold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
          >
            {currentSlide.cta}
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Перейти к баннеру ${index + 1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === activeIndex ? "w-10 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Предыдущий баннер"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => (prev + 1) % slides.length)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white transition hover:bg-white/25"
              aria-label="Следующий баннер"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}