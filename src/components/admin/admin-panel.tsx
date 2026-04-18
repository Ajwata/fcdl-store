"use client";

import { useMemo, useState } from "react";

import { ImageUploadButton } from "@/components/admin/image-upload-button";
import { VideoUploadButton } from "@/components/admin/video-upload-button";
import { CmsContent, cmsDefaults } from "@/data/cms-defaults";

type AdminPanelProps = {
  initialContent: CmsContent;
};

type TabKey = "general" | "home" | "booking" | "news" | "gallery" | "streams" | "reviews" | "documents" | "navigation";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "general", label: "Загальне" },
  { key: "home", label: "Головна" },
  { key: "booking", label: "Бронювання" },
  { key: "news", label: "Новини" },
  { key: "gallery", label: "Галерея" },
  { key: "streams", label: "Камери" },
  { key: "reviews", label: "Відгуки" },
  { key: "documents", label: "Документи" },
  { key: "navigation", label: "Меню та футер" },
];

function makeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const inputClass =
  "w-full rounded-[12px] border border-[var(--blue-200)] bg-white px-3 py-2 text-sm text-[var(--blue-950)] outline-none ring-[var(--green-700)] transition focus:ring-2";
const textareaClass =
  "w-full rounded-[12px] border border-[var(--blue-200)] bg-white px-3 py-2 text-sm text-[var(--blue-950)] outline-none ring-[var(--green-700)] transition focus:ring-2";

function FieldLabel({ children }: { children: string }) {
  return <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{children}</p>;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold text-[var(--blue-950)]">{title}</h2>
      {hint && <p className="mt-1 text-sm text-slate-600">{hint}</p>}
    </div>
  );
}

export function AdminPanel({ initialContent }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [content, setContent] = useState<CmsContent>({
    ...initialContent,
    siteName: initialContent.siteName ?? cmsDefaults.siteName,
    logoUrl: initialContent.logoUrl ?? cmsDefaults.logoUrl,
    heroMode: initialContent.heroMode ?? cmsDefaults.heroMode,
    heroBadge: initialContent.heroBadge ?? cmsDefaults.heroBadge,
    statsSection: {
      badge: initialContent.statsSection?.badge ?? cmsDefaults.statsSection.badge,
      title: initialContent.statsSection?.title ?? cmsDefaults.statsSection.title,
      description: initialContent.statsSection?.description ?? cmsDefaults.statsSection.description,
      items: initialContent.statsSection?.items?.length ? initialContent.statsSection.items : cmsDefaults.statsSection.items,
    },
    homeUiText: {
      galleryMainLabel: initialContent.homeUiText?.galleryMainLabel ?? cmsDefaults.homeUiText.galleryMainLabel,
      reviewsAverageLabel: initialContent.homeUiText?.reviewsAverageLabel ?? cmsDefaults.homeUiText.reviewsAverageLabel,
      reviewsCardLabel: initialContent.homeUiText?.reviewsCardLabel ?? cmsDefaults.homeUiText.reviewsCardLabel,
      reviewsEmptyTitle: initialContent.homeUiText?.reviewsEmptyTitle ?? cmsDefaults.homeUiText.reviewsEmptyTitle,
      reviewsEmptyDescription: initialContent.homeUiText?.reviewsEmptyDescription ?? cmsDefaults.homeUiText.reviewsEmptyDescription,
      newsFeaturedLabel: initialContent.homeUiText?.newsFeaturedLabel ?? cmsDefaults.homeUiText.newsFeaturedLabel,
      newsReadMoreLabel: initialContent.homeUiText?.newsReadMoreLabel ?? cmsDefaults.homeUiText.newsReadMoreLabel,
    },
    bookingSection: {
      ...cmsDefaults.bookingSection,
      ...(initialContent.bookingSection ?? {}),
      steps: initialContent.bookingSection?.steps?.length ? initialContent.bookingSection.steps : cmsDefaults.bookingSection.steps,
      sectorCards: initialContent.bookingSection?.sectorCards?.length ? initialContent.bookingSection.sectorCards : cmsDefaults.bookingSection.sectorCards,
    },
    reviewsSection: {
      badge: initialContent.reviewsSection?.badge ?? cmsDefaults.reviewsSection.badge,
      title: initialContent.reviewsSection?.title ?? cmsDefaults.reviewsSection.title,
      ratingTitle: initialContent.reviewsSection?.ratingTitle ?? cmsDefaults.reviewsSection.ratingTitle,
      ratingSubtitle: initialContent.reviewsSection?.ratingSubtitle ?? cmsDefaults.reviewsSection.ratingSubtitle,
      ctaText: initialContent.reviewsSection?.ctaText ?? cmsDefaults.reviewsSection.ctaText,
      allReviewsCta: initialContent.reviewsSection?.allReviewsCta ?? cmsDefaults.reviewsSection.allReviewsCta,
    },
    documents: {
      rulesPage: {
        ...cmsDefaults.documents.rulesPage,
        ...(initialContent.documents?.rulesPage ?? {}),
        sections: initialContent.documents?.rulesPage?.sections?.length ? initialContent.documents.rulesPage.sections : cmsDefaults.documents.rulesPage.sections,
      },
      privacyPolicyPage: {
        ...cmsDefaults.documents.privacyPolicyPage,
        ...(initialContent.documents?.privacyPolicyPage ?? {}),
        sections: initialContent.documents?.privacyPolicyPage?.sections?.length ? initialContent.documents.privacyPolicyPage.sections : cmsDefaults.documents.privacyPolicyPage.sections,
      },
      paymentTermsPage: {
        ...cmsDefaults.documents.paymentTermsPage,
        ...(initialContent.documents?.paymentTermsPage ?? {}),
        sections: initialContent.documents?.paymentTermsPage?.sections?.length ? initialContent.documents.paymentTermsPage.sections : cmsDefaults.documents.paymentTermsPage.sections,
      },
    },
  });
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const nextNewsId = useMemo(() => (Math.max(0, ...content.newsItems.map((item) => item.id)) || 0) + 1, [content.newsItems]);

  const updateContent = (next: CmsContent) => {
    setContent(next);
    setStatus("");
  };

  const removeByIndex = <T,>(items: T[], index: number) => items.filter((_, i) => i !== index);

  const save = async () => {
    setStatus("");
    setSaving(true);

    try {
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(result.error ?? "Не вдалося зберегти зміни.");
        return;
      }

      setStatus("Зміни збережено успішно.");
    } catch {
      setStatus("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-7 rounded-[22px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--green-700)]">Контент сайту</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--blue-950)]">Керування контентом сайту</h1>
        <p className="mt-2 text-sm text-slate-600">
          Редагуйте тексти, новини, фото та посилання у зручних формах.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--green-800)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Збереження..." : "Зберегти зміни"}
          </button>
        </div>

        {status && <p className="mt-3 text-sm font-semibold text-[var(--blue-900)]">{status}</p>}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-[var(--blue-900)] text-white"
                : "border border-[var(--blue-200)] bg-white text-[var(--blue-900)] hover:bg-[var(--blue-50)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Загальні налаштування сайту" hint="Редагуйте основні публічні дані, включно з логотипом" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Назва сайту</FieldLabel>
                <input
                  value={content.siteName}
                  onChange={(event) => updateContent({ ...content, siteName: event.target.value })}
                  className={inputClass}
                  placeholder="FCDL.STORE"
                />
              </div>
              <div>
                <FieldLabel>URL логотипа</FieldLabel>
                <div className="flex gap-2">
                  <input
                    value={content.logoUrl}
                    onChange={(event) => updateContent({ ...content, logoUrl: event.target.value })}
                    className={inputClass}
                    placeholder="/img/logo.jpg або https://..."
                  />
                  <ImageUploadButton
                    onUploaded={(url) => {
                      updateContent({ ...content, logoUrl: url });
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">Якщо поле порожнє, використовується стандартний логотип із проєкту.</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "home" && (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Відео-фон першого екрана" hint="Це відео показується на desktop у hero-блоці" />
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Режим першого екрана</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateContent({ ...content, heroMode: "video" })}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                      content.heroMode === "video"
                        ? "bg-[var(--blue-900)] text-white"
                        : "border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
                    }`}
                  >
                    Відео-фон
                  </button>
                  <button
                    type="button"
                    onClick={() => updateContent({ ...content, heroMode: "slides" })}
                    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                      content.heroMode === "slides"
                        ? "bg-[var(--blue-900)] text-white"
                        : "border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
                    }`}
                  >
                    Hero-слайди
                  </button>
                </div>
              </div>
              <div>
                <FieldLabel>Плашка над заголовком</FieldLabel>
                <input
                  value={content.heroBadge}
                  onChange={(event) => updateContent({ ...content, heroBadge: event.target.value })}
                  className={inputClass}
                  placeholder="Онлайн-бронювання поля"
                />
              </div>
            </div>
            <div>
              <FieldLabel>URL відео (MP4)</FieldLabel>
              <div className="flex gap-2">
                <input
                  value={content.heroVideoUrl}
                  onChange={(event) => updateContent({ ...content, heroVideoUrl: event.target.value })}
                  className={inputClass}
                  placeholder="/img/background.mp4 або https://.../video.mp4"
                />
                <VideoUploadButton
                  onUploaded={(url) => {
                    updateContent({ ...content, heroVideoUrl: url });
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">Рекомендовано MP4 з авто-відтворенням без звуку. На мобільних використовується зображення першого слайду.</p>
            </div>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Hero-слайди" hint="Головний блок першого екрана" />
            <div className="space-y-4">
              {content.heroSlides.map((slide, index) => (
                <div key={slide.id} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Слайд #{index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          ...content,
                          heroSlides: removeByIndex(content.heroSlides, index),
                        })
                      }
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                    >
                      Видалити
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Заголовок</FieldLabel>
                      <input
                        value={slide.title}
                        onChange={(event) => {
                          const heroSlides = [...content.heroSlides];
                          heroSlides[index] = { ...slide, title: event.target.value };
                          updateContent({ ...content, heroSlides });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Кнопка</FieldLabel>
                      <input
                        value={slide.cta}
                        onChange={(event) => {
                          const heroSlides = [...content.heroSlides];
                          heroSlides[index] = { ...slide, cta: event.target.value };
                          updateContent({ ...content, heroSlides });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <FieldLabel>Підзаголовок</FieldLabel>
                    <textarea
                      value={slide.subtitle}
                      onChange={(event) => {
                        const heroSlides = [...content.heroSlides];
                        heroSlides[index] = { ...slide, subtitle: event.target.value };
                        updateContent({ ...content, heroSlides });
                      }}
                      rows={3}
                      className={textareaClass}
                    />
                  </div>
                  <div className="mt-3">
                    <FieldLabel>URL зображення</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        value={slide.image}
                        onChange={(event) => {
                          const heroSlides = [...content.heroSlides];
                          heroSlides[index] = { ...slide, image: event.target.value };
                          updateContent({ ...content, heroSlides });
                        }}
                        className={inputClass}
                      />
                      <ImageUploadButton
                        onUploaded={(url) => {
                          const heroSlides = [...content.heroSlides];
                          heroSlides[index] = { ...slide, image: url };
                          updateContent({ ...content, heroSlides });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateContent({
                  ...content,
                  heroSlides: [
                    ...content.heroSlides,
                    {
                      id: Date.now(),
                      title: "Новий слайд",
                      subtitle: "Опис слайду",
                      cta: "Детальніше",
                      image: "",
                    },
                  ],
                })
              }
              className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
            >
              Додати слайд
            </button>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Акції" hint="Редагування карток акцій" />
            <div className="space-y-4">
              {content.promoOffers.map((offer, index) => (
                <div key={offer.id} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Акція #{index + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          ...content,
                          promoOffers: removeByIndex(content.promoOffers, index),
                        })
                      }
                      className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                    >
                      Видалити
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Назва</FieldLabel>
                      <input
                        value={offer.title}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, title: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Badge</FieldLabel>
                      <input
                        value={offer.tag}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, tag: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Вигода</FieldLabel>
                      <input
                        value={offer.benefit}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, benefit: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Термін</FieldLabel>
                      <input
                        value={offer.validUntil}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, validUntil: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <FieldLabel>Опис</FieldLabel>
                    <textarea
                      value={offer.description}
                      onChange={(event) => {
                        const promoOffers = [...content.promoOffers];
                        promoOffers[index] = { ...offer, description: event.target.value };
                        updateContent({ ...content, promoOffers });
                      }}
                      rows={3}
                      className={textareaClass}
                    />
                  </div>

                  <div className="mt-3">
                    <FieldLabel>Умови</FieldLabel>
                    <textarea
                      value={offer.terms}
                      onChange={(event) => {
                        const promoOffers = [...content.promoOffers];
                        promoOffers[index] = { ...offer, terms: event.target.value };
                        updateContent({ ...content, promoOffers });
                      }}
                      rows={2}
                      className={textareaClass}
                    />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Текст кнопки</FieldLabel>
                      <input
                        value={offer.cta}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, cta: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Посилання</FieldLabel>
                      <input
                        value={offer.href}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, href: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>URL зображення</FieldLabel>
                      <div className="flex gap-2">
                        <input
                          value={offer.image}
                          onChange={(event) => {
                            const promoOffers = [...content.promoOffers];
                            promoOffers[index] = { ...offer, image: event.target.value };
                            updateContent({ ...content, promoOffers });
                          }}
                          className={inputClass}
                        />
                        <ImageUploadButton
                          onUploaded={(url) => {
                            const promoOffers = [...content.promoOffers];
                            promoOffers[index] = { ...offer, image: url };
                            updateContent({ ...content, promoOffers });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Додатковий текст</FieldLabel>
                      <input
                        value={offer.usedBy}
                        onChange={(event) => {
                          const promoOffers = [...content.promoOffers];
                          promoOffers[index] = { ...offer, usedBy: event.target.value };
                          updateContent({ ...content, promoOffers });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                updateContent({
                  ...content,
                  promoOffers: [
                    ...content.promoOffers,
                    {
                      id: `promo-${Date.now()}`,
                      tag: "Спецпропозиція",
                      title: "Нова акція",
                      description: "Опис акції",
                      benefit: "Вигода",
                      validUntil: "Актуально",
                      terms: "Умови",
                      cta: "Перейти до бронювання",
                      href: "#booking",
                      image: "",
                      usedBy: "",
                    },
                  ],
                })
              }
              className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
            >
              Додати акцію
            </button>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Тексти секцій головної" />
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--blue-900)]">Галерея</p>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.homeGallerySection.badge}
                  onChange={(event) => updateContent({ ...content, homeGallerySection: { ...content.homeGallerySection, badge: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.homeGallerySection.title}
                  onChange={(event) => updateContent({ ...content, homeGallerySection: { ...content.homeGallerySection, title: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Опис</FieldLabel>
                <textarea
                  rows={3}
                  value={content.homeGallerySection.description}
                  onChange={(event) => updateContent({ ...content, homeGallerySection: { ...content.homeGallerySection, description: event.target.value } })}
                  className={textareaClass}
                />
              </div>

              <div className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--blue-900)]">Акції</p>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.homePromotionsSection.badge}
                  onChange={(event) => updateContent({ ...content, homePromotionsSection: { ...content.homePromotionsSection, badge: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.homePromotionsSection.title}
                  onChange={(event) => updateContent({ ...content, homePromotionsSection: { ...content.homePromotionsSection, title: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Опис</FieldLabel>
                <textarea
                  rows={3}
                  value={content.homePromotionsSection.description}
                  onChange={(event) => updateContent({ ...content, homePromotionsSection: { ...content.homePromotionsSection, description: event.target.value } })}
                  className={textareaClass}
                />
              </div>

              <div className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--blue-900)]">Новини</p>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.homeNewsSection.badge}
                  onChange={(event) => updateContent({ ...content, homeNewsSection: { ...content.homeNewsSection, badge: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.homeNewsSection.title}
                  onChange={(event) => updateContent({ ...content, homeNewsSection: { ...content.homeNewsSection, title: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Опис</FieldLabel>
                <textarea
                  rows={3}
                  value={content.homeNewsSection.description}
                  onChange={(event) => updateContent({ ...content, homeNewsSection: { ...content.homeNewsSection, description: event.target.value } })}
                  className={textareaClass}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--blue-900)]">Статистика</p>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.statsSection.badge}
                  onChange={(event) => updateContent({ ...content, statsSection: { ...content.statsSection, badge: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.statsSection.title}
                  onChange={(event) => updateContent({ ...content, statsSection: { ...content.statsSection, title: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Опис</FieldLabel>
                <textarea
                  rows={3}
                  value={content.statsSection.description}
                  onChange={(event) => updateContent({ ...content, statsSection: { ...content.statsSection, description: event.target.value } })}
                  className={textareaClass}
                />
              </div>

              <div className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <p className="mb-2 text-sm font-semibold text-[var(--blue-900)]">Відгуки</p>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.reviewsSection.badge}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, badge: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок блоку</FieldLabel>
                <input
                  value={content.reviewsSection.title}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, title: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Підзаголовок рейтингу</FieldLabel>
                <input
                  value={content.reviewsSection.ratingSubtitle}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, ratingSubtitle: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Заголовок списку відгуків</FieldLabel>
                <input
                  value={content.reviewsSection.ratingTitle}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, ratingTitle: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Текст кнопки "Залишити відгук"</FieldLabel>
                <input
                  value={content.reviewsSection.ctaText}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, ctaText: event.target.value } })}
                  className={inputClass}
                />
                <FieldLabel>Текст посилання "Усі відгуки"</FieldLabel>
                <input
                  value={content.reviewsSection.allReviewsCta}
                  onChange={(event) => updateContent({ ...content, reviewsSection: { ...content.reviewsSection, allReviewsCta: event.target.value } })}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--blue-900)]">Службові тексти головної</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Галерея: підпис головного фото</FieldLabel>
                  <input
                    value={content.homeUiText.galleryMainLabel}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, galleryMainLabel: event.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Відгуки: підпис середньої оцінки</FieldLabel>
                  <input
                    value={content.homeUiText.reviewsAverageLabel}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, reviewsAverageLabel: event.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Відгуки: заголовок картки</FieldLabel>
                  <input
                    value={content.homeUiText.reviewsCardLabel}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, reviewsCardLabel: event.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Відгуки: заголовок порожнього стану</FieldLabel>
                  <input
                    value={content.homeUiText.reviewsEmptyTitle}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, reviewsEmptyTitle: event.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <FieldLabel>Відгуки: текст порожнього стану</FieldLabel>
                  <textarea
                    rows={3}
                    value={content.homeUiText.reviewsEmptyDescription}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, reviewsEmptyDescription: event.target.value } })}
                    className={textareaClass}
                  />
                </div>
                <div>
                  <FieldLabel>Новини: плашка головної новини</FieldLabel>
                  <input
                    value={content.homeUiText.newsFeaturedLabel}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, newsFeaturedLabel: event.target.value } })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Новини: текст "детальніше"</FieldLabel>
                  <input
                    value={content.homeUiText.newsReadMoreLabel}
                    onChange={(event) => updateContent({ ...content, homeUiText: { ...content.homeUiText, newsReadMoreLabel: event.target.value } })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--blue-900)]">Плитки статистики</p>
              <div className="space-y-3">
                {content.statsSection.items.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="rounded-[12px] border border-[var(--blue-100)] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--blue-800)]">Плитка #{index + 1}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            ...content,
                            statsSection: {
                              ...content.statsSection,
                              items: removeByIndex(content.statsSection.items, index),
                            },
                          })
                        }
                        className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                      >
                        Видалити
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <FieldLabel>Значення</FieldLabel>
                        <input
                          type="number"
                          value={item.targetValue}
                          onChange={(event) => {
                            const items = [...content.statsSection.items];
                            items[index] = { ...item, targetValue: Number(event.target.value) || 0 };
                            updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Десяткові знаки</FieldLabel>
                        <input
                          type="number"
                          value={item.decimals}
                          onChange={(event) => {
                            const items = [...content.statsSection.items];
                            items[index] = { ...item, decimals: Number(event.target.value) || 0 };
                            updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Заголовок</FieldLabel>
                        <input
                          value={item.label}
                          onChange={(event) => {
                            const items = [...content.statsSection.items];
                            items[index] = { ...item, label: event.target.value };
                            updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                          }}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div>
                        <FieldLabel>Суфікс</FieldLabel>
                        <input
                          value={item.suffix}
                          onChange={(event) => {
                            const items = [...content.statsSection.items];
                            items[index] = { ...item, suffix: event.target.value };
                            updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Додатковий текст (наприклад / 5)</FieldLabel>
                        <input
                          value={item.outOf}
                          onChange={(event) => {
                            const items = [...content.statsSection.items];
                            items[index] = { ...item, outOf: event.target.value };
                            updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                          }}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 text-sm text-[var(--blue-900)]">
                          <input
                            type="checkbox"
                            checked={item.isThousands}
                            onChange={(event) => {
                              const items = [...content.statsSection.items];
                              items[index] = { ...item, isThousands: event.target.checked };
                              updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                            }}
                          />
                          Форматувати як тисячі
                        </label>
                      </div>
                    </div>

                    <div className="mt-3">
                      <FieldLabel>Опис</FieldLabel>
                      <textarea
                        rows={2}
                        value={item.description}
                        onChange={(event) => {
                          const items = [...content.statsSection.items];
                          items[index] = { ...item, description: event.target.value };
                          updateContent({ ...content, statsSection: { ...content.statsSection, items } });
                        }}
                        className={textareaClass}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  updateContent({
                    ...content,
                    statsSection: {
                      ...content.statsSection,
                      items: [
                        ...content.statsSection.items,
                        {
                          targetValue: 100,
                          decimals: 0,
                          suffix: "+",
                          outOf: "",
                          label: "новий показник",
                          description: "Опис нового показника",
                          isThousands: false,
                        },
                      ],
                    },
                  })
                }
                className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
              >
                Додати показник
              </button>
            </div>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Реквізити для оплати" hint="Ці дані бачить клієнт у кабінеті на сторінці платежів" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Отримувач</FieldLabel>
                <input
                  value={content.paymentRequisites.recipient}
                  onChange={(event) =>
                    updateContent({
                      ...content,
                      paymentRequisites: { ...content.paymentRequisites, recipient: event.target.value },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>IBAN</FieldLabel>
                <input
                  value={content.paymentRequisites.iban}
                  onChange={(event) =>
                    updateContent({
                      ...content,
                      paymentRequisites: { ...content.paymentRequisites, iban: event.target.value },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Банк</FieldLabel>
                <input
                  value={content.paymentRequisites.bank}
                  onChange={(event) =>
                    updateContent({
                      ...content,
                      paymentRequisites: { ...content.paymentRequisites, bank: event.target.value },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Призначення платежу</FieldLabel>
                <input
                  value={content.paymentRequisites.purpose}
                  onChange={(event) =>
                    updateContent({
                      ...content,
                      paymentRequisites: { ...content.paymentRequisites, purpose: event.target.value },
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === "booking" && (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Ключовий блок бронювання" hint="Тексти верхньої частини блоку з вибором сектору та часу" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.bookingSection.badge}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, badge: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.bookingSection.title}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, title: event.target.value } })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Опис</FieldLabel>
              <textarea
                rows={3}
                value={content.bookingSection.description}
                onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, description: event.target.value } })}
                className={textareaClass}
              />
            </div>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Кроки бронювання" hint="Три плашки над картками полів" />
            <div className="grid gap-3 md:grid-cols-3">
              {content.bookingSection.steps.map((step, index) => (
                <div key={`${step.label}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <FieldLabel>Плашка</FieldLabel>
                  <input
                    value={step.label}
                    onChange={(event) => {
                      const steps = [...content.bookingSection.steps];
                      steps[index] = { ...step, label: event.target.value };
                      updateContent({ ...content, bookingSection: { ...content.bookingSection, steps } });
                    }}
                    className={inputClass}
                  />
                  <div className="mt-3">
                    <FieldLabel>Назва кроку</FieldLabel>
                    <input
                      value={step.title}
                      onChange={(event) => {
                        const steps = [...content.bookingSection.steps];
                        steps[index] = { ...step, title: event.target.value };
                        updateContent({ ...content, bookingSection: { ...content.bookingSection, steps } });
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Картки секторів" hint="Назва, опис і розміри кожного поля" />
            <div className="space-y-4">
              {content.bookingSection.sectorCards.map((card, index) => (
                <div key={card.key} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Сектор {card.key}</p>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Системний ключ не змінюється</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Назва</FieldLabel>
                      <input
                        value={card.title}
                        onChange={(event) => {
                          const sectorCards = [...content.bookingSection.sectorCards];
                          sectorCards[index] = { ...card, title: event.target.value };
                          updateContent({ ...content, bookingSection: { ...content.bookingSection, sectorCards } });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Опис</FieldLabel>
                      <input
                        value={card.note}
                        onChange={(event) => {
                          const sectorCards = [...content.bookingSection.sectorCards];
                          sectorCards[index] = { ...card, note: event.target.value };
                          updateContent({ ...content, bookingSection: { ...content.bookingSection, sectorCards } });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel>Довжина, м</FieldLabel>
                      <input
                        type="number"
                        value={card.heightMeters}
                        onChange={(event) => {
                          const sectorCards = [...content.bookingSection.sectorCards];
                          sectorCards[index] = { ...card, heightMeters: Math.max(1, Number(event.target.value) || 0) };
                          updateContent({ ...content, bookingSection: { ...content.bookingSection, sectorCards } });
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <FieldLabel>Ширина, м</FieldLabel>
                      <input
                        type="number"
                        value={card.widthMeters}
                        onChange={(event) => {
                          const sectorCards = [...content.bookingSection.sectorCards];
                          sectorCards[index] = { ...card, widthMeters: Math.max(1, Number(event.target.value) || 0) };
                          updateContent({ ...content, bookingSection: { ...content.bookingSection, sectorCards } });
                        }}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Календар зайнятості" hint="Заголовки, фільтри та легенда блоку календаря" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <input
                  value={content.bookingSection.calendarBadge}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarBadge: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Заголовок</FieldLabel>
                <input
                  value={content.bookingSection.calendarTitle}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarTitle: event.target.value } })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Опис</FieldLabel>
              <textarea
                rows={3}
                value={content.bookingSection.calendarDescription}
                onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarDescription: event.target.value } })}
                className={textareaClass}
              />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Підпис дати</FieldLabel>
                <input
                  value={content.bookingSection.calendarDateLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarDateLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Підпис поля</FieldLabel>
                <input
                  value={content.bookingSection.calendarSectorLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarSectorLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Опція "усі поля"</FieldLabel>
                <input
                  value={content.bookingSection.calendarAllSectorsLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, calendarAllSectorsLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Легенда: вільно</FieldLabel>
                <input
                  value={content.bookingSection.legendFreeLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, legendFreeLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Легенда: в очікуванні</FieldLabel>
                <input
                  value={content.bookingSection.legendPendingLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, legendPendingLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <FieldLabel>Легенда: заброньовано</FieldLabel>
                <input
                  value={content.bookingSection.legendBookedLabel}
                  onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, legendBookedLabel: event.target.value } })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Пояснення під легендою</FieldLabel>
              <textarea
                rows={3}
                value={content.bookingSection.legendHint}
                onChange={(event) => updateContent({ ...content, bookingSection: { ...content.bookingSection, legendHint: event.target.value } })}
                className={textareaClass}
              />
            </div>
          </section>
        </div>
      )}

      {activeTab === "news" && (
        <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
          <SectionTitle title="Новини" hint="Додавайте та редагуйте новини" />
          <div className="space-y-4">
            {content.newsItems.map((news, index) => (
              <div key={news.id} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--blue-900)]">Новина #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        ...content,
                        newsItems: removeByIndex(content.newsItems, index),
                      })
                    }
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                  >
                    Видалити
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Заголовок</FieldLabel>
                    <input
                      value={news.title}
                      onChange={(event) => {
                        const newsItems = [...content.newsItems];
                        const title = event.target.value;
                        newsItems[index] = {
                          ...news,
                          title,
                          slug: news.slug || makeSlug(title),
                        };
                        updateContent({ ...content, newsItems });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>Дата</FieldLabel>
                    <input
                      value={news.date}
                      placeholder="17.04.2026"
                      onChange={(event) => {
                        const newsItems = [...content.newsItems];
                        newsItems[index] = { ...news, date: event.target.value };
                        updateContent({ ...content, newsItems });
                      }}
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">На сайті дата буде показана як день.місяць.рік.</p>
                  </div>
                </div>

                <div className="mt-3">
                  <FieldLabel>Slug (URL)</FieldLabel>
                  <input
                    value={news.slug}
                    onChange={(event) => {
                      const newsItems = [...content.newsItems];
                      newsItems[index] = { ...news, slug: makeSlug(event.target.value) };
                      updateContent({ ...content, newsItems });
                    }}
                    className={inputClass}
                  />
                </div>

                <div className="mt-3">
                  <FieldLabel>URL зображення</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      value={news.image}
                      onChange={(event) => {
                        const newsItems = [...content.newsItems];
                        newsItems[index] = { ...news, image: event.target.value };
                        updateContent({ ...content, newsItems });
                      }}
                      className={inputClass}
                    />
                    <ImageUploadButton
                      onUploaded={(url) => {
                        const newsItems = [...content.newsItems];
                        newsItems[index] = { ...news, image: url };
                        updateContent({ ...content, newsItems });
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <FieldLabel>Короткий опис</FieldLabel>
                  <textarea
                    rows={3}
                    value={news.excerpt}
                    onChange={(event) => {
                      const newsItems = [...content.newsItems];
                      newsItems[index] = { ...news, excerpt: event.target.value };
                      updateContent({ ...content, newsItems });
                    }}
                    className={textareaClass}
                  />
                </div>

                <div className="mt-3">
                  <FieldLabel>Повний текст (HTML)</FieldLabel>
                  <textarea
                    rows={10}
                    value={news.content}
                    onChange={(event) => {
                      const newsItems = [...content.newsItems];
                      newsItems[index] = { ...news, content: event.target.value };
                      updateContent({ ...content, newsItems });
                    }}
                    className={textareaClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updateContent({
                ...content,
                newsItems: [
                  ...content.newsItems,
                  {
                    id: nextNewsId,
                    slug: `news-${nextNewsId}`,
                    title: "Нова новина",
                    excerpt: "Короткий опис",
                    date: "",
                    image: "",
                    content: "<p>Текст новини</p>",
                  },
                ],
              })
            }
            className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
          >
            Додати новину
          </button>
        </section>
      )}

      {activeTab === "gallery" && (
        <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
          <SectionTitle title="Галерея" hint="Додавайте фото, підписи і назви" />
          <div className="space-y-4">
            {content.galleryItems.map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--blue-900)]">Фото #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        ...content,
                        galleryItems: removeByIndex(content.galleryItems, index),
                      })
                    }
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                  >
                    Видалити
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <FieldLabel>Назва</FieldLabel>
                    <input
                      value={item.title}
                      onChange={(event) => {
                        const galleryItems = [...content.galleryItems];
                        galleryItems[index] = { ...item, title: event.target.value };
                        updateContent({ ...content, galleryItems });
                      }}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel>URL фото</FieldLabel>
                    <div className="flex gap-2">
                      <input
                        value={item.image}
                        onChange={(event) => {
                          const galleryItems = [...content.galleryItems];
                          galleryItems[index] = { ...item, image: event.target.value };
                          updateContent({ ...content, galleryItems });
                        }}
                        className={inputClass}
                      />
                      <ImageUploadButton
                        onUploaded={(url) => {
                          const galleryItems = [...content.galleryItems];
                          galleryItems[index] = { ...item, image: url };
                          updateContent({ ...content, galleryItems });
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <FieldLabel>Підпис</FieldLabel>
                  <textarea
                    rows={3}
                    value={item.caption}
                    onChange={(event) => {
                      const galleryItems = [...content.galleryItems];
                      galleryItems[index] = { ...item, caption: event.target.value };
                      updateContent({ ...content, galleryItems });
                    }}
                    className={textareaClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updateContent({
                ...content,
                galleryItems: [
                  ...content.galleryItems,
                  {
                    title: "Нове фото",
                    caption: "Опис фото",
                    image: "",
                  },
                ],
              })
            }
            className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
          >
            Додати фото
          </button>
        </section>
      )}

      {activeTab === "streams" && (
        <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
          <SectionTitle title="Камери" hint="Редагування текстів та YouTube-посилань" />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel>Badge</FieldLabel>
              <input
                value={content.liveStreamsSection.badge}
                onChange={(event) =>
                  updateContent({
                    ...content,
                    liveStreamsSection: { ...content.liveStreamsSection, badge: event.target.value },
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Заголовок</FieldLabel>
              <input
                value={content.liveStreamsSection.title}
                onChange={(event) =>
                  updateContent({
                    ...content,
                    liveStreamsSection: { ...content.liveStreamsSection, title: event.target.value },
                  })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>Опис</FieldLabel>
            <textarea
              rows={3}
              value={content.liveStreamsSection.description}
              onChange={(event) =>
                updateContent({
                  ...content,
                  liveStreamsSection: { ...content.liveStreamsSection, description: event.target.value },
                })
              }
              className={textareaClass}
            />
          </div>

          <div className="mt-4 space-y-3">
            {content.liveStreamsSection.streams.map((stream, index) => (
              <div key={stream.id} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--blue-900)]">Камера #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        ...content,
                        liveStreamsSection: {
                          ...content.liveStreamsSection,
                          streams: removeByIndex(content.liveStreamsSection.streams, index),
                        },
                      })
                    }
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                  >
                    Видалити
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={stream.title}
                    onChange={(event) => {
                      const streams = [...content.liveStreamsSection.streams];
                      streams[index] = { ...stream, title: event.target.value };
                      updateContent({
                        ...content,
                        liveStreamsSection: { ...content.liveStreamsSection, streams },
                      });
                    }}
                    placeholder="Назва"
                    className={inputClass}
                  />
                  <input
                    value={stream.url}
                    onChange={(event) => {
                      const streams = [...content.liveStreamsSection.streams];
                      streams[index] = { ...stream, url: event.target.value };
                      updateContent({
                        ...content,
                        liveStreamsSection: { ...content.liveStreamsSection, streams },
                      });
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updateContent({
                ...content,
                liveStreamsSection: {
                  ...content.liveStreamsSection,
                  streams: [
                    ...content.liveStreamsSection.streams,
                    {
                      id: `stream-${Date.now()}`,
                      title: "Нова камера",
                      url: "",
                    },
                  ],
                },
              })
            }
            className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
          >
            Додати камеру
          </button>
        </section>
      )}

      {activeTab === "reviews" && (
        <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
          <SectionTitle title="Відгуки" />
          <div className="space-y-4">
            {content.testimonials.map((review, index) => (
              <div key={`${review.name}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--blue-900)]">Відгук #{index + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        ...content,
                        testimonials: removeByIndex(content.testimonials, index),
                      })
                    }
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                  >
                    Видалити
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={review.name}
                    onChange={(event) => {
                      const testimonials = [...content.testimonials];
                      testimonials[index] = { ...review, name: event.target.value };
                      updateContent({ ...content, testimonials });
                    }}
                    placeholder="Ім'я"
                    className={inputClass}
                  />
                  <input
                    value={review.rating}
                    onChange={(event) => {
                      const testimonials = [...content.testimonials];
                      testimonials[index] = { ...review, rating: event.target.value };
                      updateContent({ ...content, testimonials });
                    }}
                    placeholder="Оцінка"
                    className={inputClass}
                  />
                </div>
                <textarea
                  rows={3}
                  value={review.text}
                  onChange={(event) => {
                    const testimonials = [...content.testimonials];
                    testimonials[index] = { ...review, text: event.target.value };
                    updateContent({ ...content, testimonials });
                  }}
                  className={`${textareaClass} mt-3`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              updateContent({
                ...content,
                testimonials: [
                  ...content.testimonials,
                  {
                    name: "Новий клієнт",
                    text: "Текст відгуку",
                    rating: "5.0",
                  },
                ],
              })
            }
            className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
          >
            Додати відгук
          </button>
        </section>
      )}

      {activeTab === "documents" && (
        <div className="space-y-5">
          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Сторінка правил" hint="Редагування hero-текстів і пунктів правил" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <input value={content.documents.rulesPage.badge} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, badge: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Заголовок</FieldLabel>
                <input value={content.documents.rulesPage.title} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, title: event.target.value } } })} className={inputClass} />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Опис</FieldLabel>
              <textarea rows={3} value={content.documents.rulesPage.description} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, description: event.target.value } } })} className={textareaClass} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Плашка оновлення</FieldLabel>
                <input value={content.documents.rulesPage.updatedLabel} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, updatedLabel: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Пояснення у бічній картці</FieldLabel>
                <input value={content.documents.rulesPage.updatedHint} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, updatedHint: event.target.value } } })} className={inputClass} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {content.documents.rulesPage.sections.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Пункт #{index + 1}</p>
                    <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, sections: removeByIndex(content.documents.rulesPage.sections, index) } } })} className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600">Видалити</button>
                  </div>
                  <div>
                    <FieldLabel>Заголовок</FieldLabel>
                    <input value={item.title} onChange={(event) => {
                      const sections = [...content.documents.rulesPage.sections];
                      sections[index] = { ...item, title: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, sections } } });
                    }} className={inputClass} />
                  </div>
                  <div className="mt-3">
                    <FieldLabel>Текст</FieldLabel>
                    <textarea rows={3} value={item.text} onChange={(event) => {
                      const sections = [...content.documents.rulesPage.sections];
                      sections[index] = { ...item, text: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, sections } } });
                    }} className={textareaClass} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, rulesPage: { ...content.documents.rulesPage, sections: [...content.documents.rulesPage.sections, { title: "Новий пункт", text: "Текст пункту" }] } } })} className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]">Додати пункт</button>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Політика конфіденційності" hint="Редагування заголовка, опису і розділів політики" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <input value={content.documents.privacyPolicyPage.badge} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, badge: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Заголовок</FieldLabel>
                <input value={content.documents.privacyPolicyPage.title} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, title: event.target.value } } })} className={inputClass} />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Опис</FieldLabel>
              <textarea rows={3} value={content.documents.privacyPolicyPage.description} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, description: event.target.value } } })} className={textareaClass} />
            </div>
            <div className="mt-4 space-y-3">
              {content.documents.privacyPolicyPage.sections.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Розділ #{index + 1}</p>
                    <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, sections: removeByIndex(content.documents.privacyPolicyPage.sections, index) } } })} className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600">Видалити</button>
                  </div>
                  <div>
                    <FieldLabel>Заголовок</FieldLabel>
                    <input value={item.title} onChange={(event) => {
                      const sections = [...content.documents.privacyPolicyPage.sections];
                      sections[index] = { ...item, title: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, sections } } });
                    }} className={inputClass} />
                  </div>
                  <div className="mt-3">
                    <FieldLabel>Текст</FieldLabel>
                    <textarea rows={3} value={item.text} onChange={(event) => {
                      const sections = [...content.documents.privacyPolicyPage.sections];
                      sections[index] = { ...item, text: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, sections } } });
                    }} className={textareaClass} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, privacyPolicyPage: { ...content.documents.privacyPolicyPage, sections: [...content.documents.privacyPolicyPage.sections, { title: "Новий розділ", text: "Текст розділу" }] } } })} className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]">Додати розділ</button>
          </section>

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Умови оплати" hint="Редагування hero, контактів підтримки і текстів сторінки" />
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Badge</FieldLabel>
                <input value={content.documents.paymentTermsPage.badge} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, badge: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Заголовок</FieldLabel>
                <input value={content.documents.paymentTermsPage.title} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, title: event.target.value } } })} className={inputClass} />
              </div>
            </div>
            <div className="mt-3">
              <FieldLabel>Опис</FieldLabel>
              <textarea rows={3} value={content.documents.paymentTermsPage.description} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, description: event.target.value } } })} className={textareaClass} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Заголовок підтримки</FieldLabel>
                <input value={content.documents.paymentTermsPage.supportLabel} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, supportLabel: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Email підтримки</FieldLabel>
                <input value={content.documents.paymentTermsPage.supportEmail} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, supportEmail: event.target.value } } })} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Телефон підтримки</FieldLabel>
                <input value={content.documents.paymentTermsPage.supportPhone} onChange={(event) => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, supportPhone: event.target.value } } })} className={inputClass} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {content.documents.paymentTermsPage.sections.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-[14px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--blue-900)]">Розділ #{index + 1}</p>
                    <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, sections: removeByIndex(content.documents.paymentTermsPage.sections, index) } } })} className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600">Видалити</button>
                  </div>
                  <div>
                    <FieldLabel>Заголовок</FieldLabel>
                    <input value={item.title} onChange={(event) => {
                      const sections = [...content.documents.paymentTermsPage.sections];
                      sections[index] = { ...item, title: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, sections } } });
                    }} className={inputClass} />
                  </div>
                  <div className="mt-3">
                    <FieldLabel>Текст</FieldLabel>
                    <textarea rows={3} value={item.text} onChange={(event) => {
                      const sections = [...content.documents.paymentTermsPage.sections];
                      sections[index] = { ...item, text: event.target.value };
                      updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, sections } } });
                    }} className={textareaClass} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => updateContent({ ...content, documents: { ...content.documents, paymentTermsPage: { ...content.documents.paymentTermsPage, sections: [...content.documents.paymentTermsPage.sections, { title: "Новий розділ", text: "Текст розділу" }] } } })} className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]">Додати розділ</button>
          </section>
        </div>
      )}

      {activeTab === "navigation" && (
        <div className="space-y-5">
          {[
            { key: "navigationItems", title: "Верхнє меню" },
            { key: "footerNavLinks", title: "Футер: Навігація" },
            { key: "footerDocLinks", title: "Футер: Документи" },
            { key: "footerSocialLinks", title: "Футер: Соцмережі" },
          ].map((block) => {
            const list = content[block.key as "navigationItems" | "footerNavLinks" | "footerDocLinks" | "footerSocialLinks"];

            return (
              <section key={block.key} className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
                <SectionTitle title={block.title} />
                <div className="space-y-3">
                  {list.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="grid gap-2 rounded-[12px] border border-[var(--blue-100)] bg-[var(--blue-50)] p-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
                      <input
                        value={item.label}
                        onChange={(event) => {
                          const next = [...list];
                          next[index] = { ...item, label: event.target.value };
                          updateContent({ ...content, [block.key]: next } as CmsContent);
                        }}
                        placeholder="Назва"
                        className={inputClass}
                      />
                      <input
                        value={item.href}
                        onChange={(event) => {
                          const next = [...list];
                          next[index] = { ...item, href: event.target.value };
                          updateContent({ ...content, [block.key]: next } as CmsContent);
                        }}
                        placeholder="Посилання"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = removeByIndex(list, index);
                          updateContent({ ...content, [block.key]: next } as CmsContent);
                        }}
                        className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-red-600"
                      >
                        Видалити
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = [...list, { label: "Нове посилання", href: "/" }];
                    updateContent({ ...content, [block.key]: next } as CmsContent);
                  }}
                  className="mt-4 rounded-full border border-[var(--green-700)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--green-700)]"
                >
                  Додати посилання
                </button>
              </section>
            );
          })}

          <section className="rounded-[20px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_8px_26px_rgba(8,26,51,0.06)]">
            <SectionTitle title="Публічний контакт адміністрації" hint="На сайті показується один загальний контакт без прив'язки до конкретної людини" />
            {(() => {
              const admin = content.adminContacts[0] ?? {
                id: "admin-1",
                name: "Адміністрація поля",
                description: "Єдиний контакт для бронювання, оплати та уточнення деталей матчу.",
                phone: "+380",
                photo: "",
              };

              const updateAdmin = (updates: Partial<typeof admin>) => {
                updateContent({
                  ...content,
                  adminContacts: [{ ...admin, ...updates }],
                });
              };

              return (
                <div className="rounded-[16px] border border-[var(--blue-100)] bg-[linear-gradient(135deg,#f8fbff_0%,#eef7ff_58%,#f4fbf7_100%)] p-4 sm:p-5">
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="space-y-3">
                      <div>
                        <FieldLabel>Заголовок блоку</FieldLabel>
                        <input
                          value={admin.name}
                          onChange={(event) => updateAdmin({ name: event.target.value })}
                          placeholder="Наприклад: Адміністрація поля"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Опис</FieldLabel>
                        <textarea
                          value={admin.description ?? ""}
                          onChange={(event) => updateAdmin({ description: event.target.value })}
                          rows={3}
                          placeholder="Короткий текст під заголовком"
                          className={textareaClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Телефон</FieldLabel>
                        <input
                          value={admin.phone}
                          onChange={(event) => updateAdmin({ phone: event.target.value })}
                          placeholder="Телефон"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <FieldLabel>Фото/зображення блоку</FieldLabel>
                        <div className="flex gap-2">
                          <input
                            value={admin.photo}
                            onChange={(event) => updateAdmin({ photo: event.target.value })}
                            placeholder="URL фото"
                            className={inputClass}
                          />
                          <ImageUploadButton onUploaded={(url) => updateAdmin({ photo: url })} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[18px] border border-[var(--blue-100)] bg-white p-4 shadow-[0_10px_30px_rgba(8,26,51,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">Попередній перегляд</p>
                      <p className="mt-3 text-2xl font-bold text-[var(--blue-950)]">{admin.name || "Адміністрація поля"}</p>
                      <p className="mt-2 text-sm text-slate-600">{admin.description || "Єдиний публічний номер для бронювання, оплат та уточнення деталей матчу."}</p>
                      <p className="mt-4 text-lg font-semibold text-[var(--green-800)]">{admin.phone || "+380"}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--green-800)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Збереження..." : "Зберегти зміни"}
        </button>
      </div>
    </div>
  );
}
