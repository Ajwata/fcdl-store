"use client";

import { useCallback, useEffect, useState } from "react";

type GalleryItem = {
  title: string;
  caption: string;
  image: string;
};

type GalleryLightboxProps = {
  items: GalleryItem[];
};

export function GalleryLightbox({ items }: GalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const tileClasses = [
    "md:col-span-2 lg:col-span-7 lg:row-span-3",
    "md:col-span-1 lg:col-span-5 lg:row-span-2",
    "md:col-span-1 lg:col-span-5 lg:row-span-2",
    "md:col-span-2 lg:col-span-7 lg:row-span-3",
  ];

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
    setZoom(1);
  }, []);

  const showPrev = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) {
        return prev;
      }
      return (prev - 1 + items.length) % items.length;
    });
    setZoom(1);
  }, [items.length]);

  const showNext = useCallback(() => {
    setActiveIndex((prev) => {
      if (prev === null) {
        return prev;
      }
      return (prev + 1) % items.length;
    });
    setZoom(1);
  }, [items.length]);

  const zoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.2, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.2, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  useEffect(() => {
    if (activeIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
      if (event.key === "ArrowLeft") {
        showPrev();
      }
      if (event.key === "ArrowRight") {
        showNext();
      }
      if (event.key === "+" || event.key === "=") {
        zoomIn();
      }
      if (event.key === "-") {
        zoomOut();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, closeLightbox, showNext, showPrev, zoomIn, zoomOut]);

  return (
    <>
      <div className="grid auto-rows-[240px] gap-4 sm:auto-rows-[280px] md:grid-cols-2 md:auto-rows-[190px] lg:grid-cols-12 lg:auto-rows-[120px]">
        {items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              setActiveIndex(index);
              setZoom(1);
            }}
            className={`group animate-rise relative overflow-hidden rounded-[22px] border border-[var(--blue-100)] text-left shadow-[0_14px_34px_rgba(8,26,51,0.12)] ${tileClasses[index % tileClasses.length]}`}
            style={{ animationDelay: `${index * 80}ms` }}
            aria-label={`Відкрити фото: ${item.title}`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${item.image})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,51,0.04)_18%,rgba(8,26,51,0.78)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
              <h2 className="text-lg font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-xl">{item.title}</h2>
              <p className="mt-2 max-w-2xl text-xs leading-6 text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)] sm:text-sm">
                {item.caption}
              </p>
            </div>
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div className="fixed inset-0 z-[80] bg-black/92 p-4 sm:p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 text-xl font-bold text-white transition hover:bg-black/65 sm:right-6 sm:top-6"
            aria-label="Закрити"
          >
            ×
          </button>

          <button
            type="button"
            onClick={showPrev}
            className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-2xl text-white transition hover:bg-black/65 sm:left-6"
            aria-label="Попереднє фото"
          >
            ‹
          </button>

          <button
            type="button"
            onClick={showNext}
            className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-2xl text-white transition hover:bg-black/65 sm:right-6"
            aria-label="Наступне фото"
          >
            ›
          </button>

          <div className="mx-auto flex h-full max-w-6xl flex-col items-center justify-center gap-4 pt-12 sm:pt-8">
            <div
              className="relative flex h-[62vh] w-full items-center justify-center overflow-hidden rounded-[16px] border border-white/15 bg-black/45 sm:h-[72vh]"
              onWheel={(event) => {
                event.preventDefault();
                if (event.deltaY < 0) {
                  zoomIn();
                } else {
                  zoomOut();
                }
              }}
            >
              <img
                src={items[activeIndex].image}
                alt={items[activeIndex].title}
                className="max-h-full max-w-full object-contain transition duration-200"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>

            <div className="w-full max-w-4xl">
              <h3 className="text-xl font-bold text-white sm:text-2xl">{items[activeIndex].title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/85 sm:text-base">{items[activeIndex].caption}</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={zoomOut}
                className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/65"
              >
                -
              </button>
              <span className="rounded-full border border-white/20 bg-black/35 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/25 bg-black/45 px-3 py-2 text-sm font-semibold text-white transition hover:bg-black/65"
              >
                +
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="rounded-full border border-white/25 bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-black/65"
              >
                Скинути zoom
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
