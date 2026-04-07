"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Stream = {
  id: string;
  title: string;
  url: string;
};

const defaultStreams: Stream[] = [
  {
    id: "stream-1",
    title: "Трансляція 1",
    url: "https://www.youtube.com/watch?v=6dOp2sXsopI",
  },
  {
    id: "stream-2",
    title: "Трансляція 2",
    url: "https://www.youtube.com/watch?v=2PhXiuIeVuk",
  },
  {
    id: "stream-3",
    title: "Трансляція 3",
    url: "https://www.youtube.com/watch?v=JNQvXt81V9U",
  },
];

type LiveStreamsProps = {
  badge?: string;
  title?: string;
  description?: string;
  streams?: Stream[];
};

function getYoutubeVideoId(url: string): string {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }

    return parsed.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
}

export function LiveStreams({
  badge = "Камери",
  title = "Дивіться онлайн трансляції матчів",
  description = "Обирайте потрібну камеру та дивіться матч у прямому ефірі. Усі трансляції доступні прямо на сторінці.",
  streams = defaultStreams,
}: LiveStreamsProps) {
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const isFullscreenRef = useRef(false);

  const streamsWithIds = useMemo(() => {
    return streams.map((stream) => ({
      ...stream,
      videoId: getYoutubeVideoId(stream.url),
    }));
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !isFullscreenRef.current) {
          setActiveStreamId(null);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;

    const updateFullscreenState = () => {
      isFullscreenRef.current = Boolean(document.fullscreenElement);
    };

    const isIframeFocusInsideSection = () => {
      if (!section) {
        return false;
      }

      const activeElement = document.activeElement;

      return activeElement instanceof HTMLIFrameElement && section.contains(activeElement);
    };

    const handleVisibility = () => {
      if (document.hidden && !isFullscreenRef.current) {
        setActiveStreamId(null);
      }
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (!isFullscreenRef.current && !isIframeFocusInsideSection()) {
          setActiveStreamId(null);
        }
      }, 0);
    };

    document.addEventListener("fullscreenchange", updateFullscreenState);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreenState);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  return (
    <section ref={sectionRef} className="live-panel animate-rise">
      <p className="text-sm font-bold uppercase tracking-[0.3em] text-[var(--green-700)]">{badge}</p>
      <h2 className="mt-4 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">{title}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
        {description}
      </p>

      <div className="mt-7 space-y-6">
        {/* Main featured stream */}
        <div className="grid gap-6">
          {streamsWithIds.slice(0, 1).map((stream, index) => {
            const isActive = activeStreamId === stream.id;
            const thumbnail = `https://i.ytimg.com/vi/${stream.videoId}/hqdefault.jpg`;
            const embedUrl = `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`;

            return (
              <article
                key={stream.id}
                className="overflow-hidden rounded-[24px] border border-[var(--blue-100)] bg-white shadow-[0_16px_36px_rgba(8,26,51,0.1)] lg:min-h-[500px]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="relative aspect-video lg:aspect-auto lg:h-[500px] bg-[var(--blue-950)]">
                  {isActive ? (
                    <>
                      <iframe
                        title={stream.title}
                        src={embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                      <button
                        type="button"
                        onClick={() => setActiveStreamId(null)}
                        className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
                      >
                        Зупинити
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveStreamId(stream.id)}
                      className="group relative h-full w-full text-left"
                      aria-label={`Увімкнути ${stream.title}`}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.15), rgba(8,26,51,0.72)), url(${thumbnail})`,
                        }}
                      />
                      <div className="relative z-10 flex h-full flex-col items-start justify-end p-4 sm:p-5">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
                          <span className="h-2 w-2 rounded-full bg-[#ff4f4f] shadow-[0_0_10px_rgba(255,79,79,0.9)]" />
                          Live
                        </span>
                        <p className="mt-3 text-lg font-bold text-white">{stream.title}</p>
                        <p className="mt-1 text-sm text-white/78">Натисни, щоб почати перегляд</p>
                      </div>
                      <span className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-white/24">
                        <span className="ml-0.5 h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white" />
                      </span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Two smaller streams below */}
        <div className="grid gap-6 md:grid-cols-2">
          {streamsWithIds.slice(1).map((stream, index) => {
            const isActive = activeStreamId === stream.id;
            const thumbnail = `https://i.ytimg.com/vi/${stream.videoId}/hqdefault.jpg`;
            const embedUrl = `https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=0&rel=0&modestbranding=1&playsinline=1`;

            return (
              <article
                key={stream.id}
                className="overflow-hidden rounded-[24px] border border-[var(--blue-100)] bg-white shadow-[0_16px_36px_rgba(8,26,51,0.1)]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
              <div className="relative aspect-video bg-[var(--blue-950)]">
                {isActive ? (
                  <>
                    <iframe
                      title={stream.title}
                      src={embedUrl}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    <button
                      type="button"
                      onClick={() => setActiveStreamId(null)}
                      className="absolute right-3 top-3 z-10 rounded-full border border-white/30 bg-black/40 px-4 py-2 text-xs font-semibold text-white transition hover:bg-black/60"
                    >
                      Зупинити
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveStreamId(stream.id)}
                    className="group relative h-full w-full text-left"
                    aria-label={`Увімкнути ${stream.title}`}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(180deg, rgba(8,26,51,0.15), rgba(8,26,51,0.72)), url(${thumbnail})`,
                      }}
                    />
                    <div className="relative z-10 flex h-full flex-col items-start justify-end p-4 sm:p-5">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
                        <span className="h-2 w-2 rounded-full bg-[#ff4f4f] shadow-[0_0_10px_rgba(255,79,79,0.9)]" />
                        Live
                      </span>
                      <p className="mt-3 text-lg font-bold text-white">{stream.title}</p>
                      <p className="mt-1 text-sm text-white/78">Натисни, щоб почати перегляд</p>
                    </div>
                    <span className="absolute right-4 top-4 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/25 bg-white/15 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-white/24">
                      <span className="ml-0.5 h-0 w-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white" />
                    </span>
                  </button>
                )}
              </div>
            </article>
          );
          })}
        </div>
      </div>
    </section>
  );
}
