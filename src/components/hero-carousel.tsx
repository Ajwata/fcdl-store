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
  videoUrl: string;
};

export function HeroCarousel({ slides, videoUrl }: HeroCarouselProps) {
  if (slides.length === 0) {
    return null;
  }

  const mainSlide = slides[0];
  const titleWords = mainSlide.title.trim().split(/\s+/);
  const desktopFirstLine = titleWords.slice(0, Math.max(1, titleWords.length - 2)).join(" ");
  const desktopSecondLine = titleWords.slice(Math.max(1, titleWords.length - 2)).join(" ");
  const desktopFirstLineParts = desktopFirstLine.split(/(онлайн)/iu);

  return (
    <section className="relative min-h-screen overflow-hidden pt-[76px]">
      <video
        className="absolute inset-0 hidden h-full w-full object-cover md:block"
        src={videoUrl || "/img/background.mp4"}
        autoPlay
        muted
        loop
        playsInline
      />
      <div
        className="absolute inset-0 bg-cover bg-center md:hidden"
        style={{ backgroundImage: `url(${mainSlide.image})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,26,51,0.32)_0%,rgba(8,26,51,0.64)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl flex-col justify-end px-6 pb-14 sm:pb-18 lg:px-10 lg:pb-22">
        <div className="max-w-3xl rounded-[24px] border border-white/25 bg-white/10 p-6 backdrop-blur-md sm:p-8 lg:max-w-[52rem] lg:p-6">
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-[var(--green-100)]">Онлайн-бронювання поля</p>
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