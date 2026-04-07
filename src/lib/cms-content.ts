import { promises as fs } from "node:fs";
import path from "node:path";

import { CmsContent, cmsDefaults } from "@/data/cms-defaults";

const cmsFilePath = path.join(process.cwd(), "src", "data", "cms-content.json");

function mergeCmsContent(partial: Partial<CmsContent>): CmsContent {
  return {
    ...cmsDefaults,
    ...partial,
    navigationItems: partial.navigationItems ?? cmsDefaults.navigationItems,
    heroVideoUrl: partial.heroVideoUrl ?? cmsDefaults.heroVideoUrl,
    heroSlides: partial.heroSlides ?? cmsDefaults.heroSlides,
    galleryItems: partial.galleryItems ?? cmsDefaults.galleryItems,
    newsItems: partial.newsItems ?? cmsDefaults.newsItems,
    testimonials: partial.testimonials ?? cmsDefaults.testimonials,
    footerNavLinks: partial.footerNavLinks ?? cmsDefaults.footerNavLinks,
    footerDocLinks: partial.footerDocLinks ?? cmsDefaults.footerDocLinks,
    footerSocialLinks: partial.footerSocialLinks ?? cmsDefaults.footerSocialLinks,
    promoOffers: partial.promoOffers ?? cmsDefaults.promoOffers,
    liveStreamsSection: {
      ...cmsDefaults.liveStreamsSection,
      ...(partial.liveStreamsSection ?? {}),
      streams: partial.liveStreamsSection?.streams ?? cmsDefaults.liveStreamsSection.streams,
    },
    homeGallerySection: {
      ...cmsDefaults.homeGallerySection,
      ...(partial.homeGallerySection ?? {}),
    },
    homePromotionsSection: {
      ...cmsDefaults.homePromotionsSection,
      ...(partial.homePromotionsSection ?? {}),
    },
    homeNewsSection: {
      ...cmsDefaults.homeNewsSection,
      ...(partial.homeNewsSection ?? {}),
    },
  };
}

export async function getCmsContent(): Promise<CmsContent> {
  try {
    const raw = await fs.readFile(cmsFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CmsContent>;
    return mergeCmsContent(parsed);
  } catch {
    return cmsDefaults;
  }
}

export async function saveCmsContent(content: CmsContent): Promise<void> {
  const merged = mergeCmsContent(content);
  await fs.writeFile(cmsFilePath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
}
