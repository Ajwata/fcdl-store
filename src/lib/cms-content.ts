import { promises as fs } from "node:fs";
import path from "node:path";

import { CmsContent, cmsDefaults } from "@/data/cms-defaults";
import { getPrismaClient, isDatabaseEnabled, isStrictDatabaseMode } from "@/lib/prisma";

const cmsFilePath = path.join(process.cwd(), "src", "data", "cms-content.json");

function mergeCmsContent(partial: Partial<CmsContent>): CmsContent {
  return {
    ...cmsDefaults,
    ...partial,
    siteName: partial.siteName ?? cmsDefaults.siteName,
    logoUrl: partial.logoUrl ?? cmsDefaults.logoUrl,
    navigationItems: partial.navigationItems ?? cmsDefaults.navigationItems,
    heroMode: partial.heroMode ?? cmsDefaults.heroMode,
    heroBadge: partial.heroBadge ?? cmsDefaults.heroBadge,
    heroVideoUrl: partial.heroVideoUrl ?? cmsDefaults.heroVideoUrl,
    heroSlides: partial.heroSlides ?? cmsDefaults.heroSlides,
    galleryItems: partial.galleryItems ?? cmsDefaults.galleryItems,
    newsItems: partial.newsItems ?? cmsDefaults.newsItems,
    testimonials: partial.testimonials ?? cmsDefaults.testimonials,
    footerNavLinks: partial.footerNavLinks ?? cmsDefaults.footerNavLinks,
    footerDocLinks: partial.footerDocLinks ?? cmsDefaults.footerDocLinks,
    footerSocialLinks: partial.footerSocialLinks ?? cmsDefaults.footerSocialLinks,
    footerContent: {
      ...cmsDefaults.footerContent,
      ...(partial.footerContent ?? {}),
    },
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
    homeUiText: {
      ...cmsDefaults.homeUiText,
      ...(partial.homeUiText ?? {}),
    },
    bookingSection: {
      ...cmsDefaults.bookingSection,
      ...(partial.bookingSection ?? {}),
      steps: partial.bookingSection?.steps ?? cmsDefaults.bookingSection.steps,
      sectorCards: (partial.bookingSection?.sectorCards ?? cmsDefaults.bookingSection.sectorCards).map((card) => {
        const fallback = cmsDefaults.bookingSection.sectorCards.find((item) => item.key === card.key);
        return {
          ...(fallback ?? card),
          ...card,
          imageUrl: card.imageUrl ?? fallback?.imageUrl ?? "",
        };
      }),
    },
    statsSection: {
      ...cmsDefaults.statsSection,
      ...(partial.statsSection ?? {}),
      items: partial.statsSection?.items ?? cmsDefaults.statsSection.items,
    },
    reviewsSection: {
      ...cmsDefaults.reviewsSection,
      ...(partial.reviewsSection ?? {}),
    },
    documents: {
      rulesPage: {
        ...cmsDefaults.documents.rulesPage,
        ...(partial.documents?.rulesPage ?? {}),
        sections: partial.documents?.rulesPage?.sections ?? cmsDefaults.documents.rulesPage.sections,
      },
      privacyPolicyPage: {
        ...cmsDefaults.documents.privacyPolicyPage,
        ...(partial.documents?.privacyPolicyPage ?? {}),
        sections: partial.documents?.privacyPolicyPage?.sections ?? cmsDefaults.documents.privacyPolicyPage.sections,
      },
      paymentTermsPage: {
        ...cmsDefaults.documents.paymentTermsPage,
        ...(partial.documents?.paymentTermsPage ?? {}),
        sections: partial.documents?.paymentTermsPage?.sections ?? cmsDefaults.documents.paymentTermsPage.sections,
      },
    },
    paymentRequisites: {
      ...cmsDefaults.paymentRequisites,
      ...(partial.paymentRequisites ?? {}),
    },
    adminContacts: partial.adminContacts ?? cmsDefaults.adminContacts,
  };
}

export async function getCmsContent(): Promise<CmsContent> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.cmsConfig.findUnique({ where: { id: "default" } });
    if (isStrictDatabaseMode() && !row) {
      throw new Error("Missing required cms config row 'default' in strict database mode");
    }
    return mergeCmsContent((row?.content ?? {}) as Partial<CmsContent>);
  }

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

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.cmsConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        content: merged,
        updatedAt: new Date(),
      },
      update: {
        content: merged,
        updatedAt: new Date(),
      },
    });
    return;
  }

  await fs.writeFile(cmsFilePath, `${JSON.stringify(merged, null, 2)}\n`, "utf-8");
}
