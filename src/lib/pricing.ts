import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled, isStrictDatabaseMode } from "@/lib/prisma";

export type SectorPricingEntry = {
  dayPrice: number;
  eveningPrice: number;
};

export type DurationDiscountRule = {
  minHours: number;
  maxHours: number | null;
  discountPercent: number;
};

export type PricingConfig = {
  eveningStartHour: number;
  sectors: Record<string, SectorPricingEntry>;
  durationDiscountRules: DurationDiscountRule[];
};

const SECTOR_KEYS = ["№1", "№2", "№3", "№4"] as const;

export const pricingDefaults: PricingConfig = {
  eveningStartHour: 18,
  sectors: {
    "№1": { dayPrice: 900, eveningPrice: 1100 },
    "№2": { dayPrice: 800, eveningPrice: 1000 },
    "№3": { dayPrice: 900, eveningPrice: 1100 },
    "№4": { dayPrice: 2500, eveningPrice: 3000 },
  },
  durationDiscountRules: [
    { minHours: 2, maxHours: 4, discountPercent: 10 },
    { minHours: 5, maxHours: 8, discountPercent: 18 },
  ],
};

const pricingFilePath = path.join(process.cwd(), "src", "data", "pricing.json");

function sanitizeDurationDiscountRules(input: unknown): DurationDiscountRule[] {
  if (!Array.isArray(input)) {
    return pricingDefaults.durationDiscountRules;
  }

  const normalized = input
    .map((rule) => {
      if (!rule || typeof rule !== "object") return null;
      const item = rule as { minHours?: unknown; maxHours?: unknown; discountPercent?: unknown };
      const minHours = Math.max(1, Math.round(Number(item.minHours)));
      const rawMax = item.maxHours;
      const maxHours = rawMax === null || rawMax === undefined || rawMax === ""
        ? null
        : Math.max(minHours, Math.round(Number(rawMax)));
      const discountPercent = Math.max(0, Math.min(100, Math.round(Number(item.discountPercent))));

      if (!Number.isFinite(minHours) || !Number.isFinite(discountPercent)) {
        return null;
      }

      if (maxHours !== null && !Number.isFinite(maxHours)) {
        return null;
      }

      return {
        minHours,
        maxHours,
        discountPercent,
      };
    })
    .filter((rule): rule is DurationDiscountRule => Boolean(rule));

  if (normalized.length === 0) {
    return [];
  }

  return normalized.sort((a, b) => a.minHours - b.minHours);
}

export async function getPricing(): Promise<PricingConfig> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.pricingSettings.findUnique({
      where: { id: "default" },
      include: {
        sectors: true,
        durationDiscountRules: {
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });

    if (isStrictDatabaseMode() && !row) {
      throw new Error("Missing required pricing settings row 'default' in strict database mode");
    }

    if (!row) {
      return pricingDefaults;
    }

    const sectors = { ...pricingDefaults.sectors };
    for (const sector of row.sectors) {
      sectors[sector.sector] = {
        dayPrice: sector.dayPrice,
        eveningPrice: sector.eveningPrice,
      };
    }

    return {
      eveningStartHour: row.eveningStartHour ?? pricingDefaults.eveningStartHour,
      sectors,
      durationDiscountRules: sanitizeDurationDiscountRules(
        row.durationDiscountRules.map((rule) => ({
          minHours: rule.minHours,
          maxHours: rule.maxHours,
          discountPercent: rule.discountPercent,
        })),
      ),
    };
  }

  try {
    const raw = await fs.readFile(pricingFilePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<PricingConfig>;
    return {
      eveningStartHour: parsed.eveningStartHour ?? pricingDefaults.eveningStartHour,
      sectors: {
        ...pricingDefaults.sectors,
        ...(parsed.sectors ?? {}),
      },
      durationDiscountRules: sanitizeDurationDiscountRules(parsed.durationDiscountRules),
    };
  } catch {
    return pricingDefaults;
  }
}

export async function savePricing(config: PricingConfig): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const normalizedRules = sanitizeDurationDiscountRules(config.durationDiscountRules);

    await prisma.$transaction(async (tx) => {
      await tx.pricingSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          eveningStartHour: config.eveningStartHour,
          updatedAt: new Date(),
        },
        update: {
          eveningStartHour: config.eveningStartHour,
          updatedAt: new Date(),
        },
      });

      await tx.pricingSector.deleteMany({ where: { settingsId: "default" } });
      await tx.pricingSector.createMany({
        data: Object.entries(config.sectors).map(([sector, prices]) => ({
          settingsId: "default",
          sector,
          dayPrice: prices.dayPrice,
          eveningPrice: prices.eveningPrice,
          updatedAt: new Date(),
        })),
      });

      await tx.pricingDurationRule.deleteMany({ where: { settingsId: "default" } });
      if (normalizedRules.length > 0) {
        await tx.pricingDurationRule.createMany({
          data: normalizedRules.map((rule, index) => ({
            settingsId: "default",
            minHours: rule.minHours,
            maxHours: rule.maxHours,
            discountPercent: rule.discountPercent,
            sortOrder: index,
          })),
        });
      }
    });
    return;
  }

  await fs.writeFile(pricingFilePath, JSON.stringify(config, null, 2), "utf-8");
}

/** Calculate price for a time slot given start hour and duration */
export function calcSlotPrice(pricing: PricingConfig, sector: string, startHour: number, durationHours: number): number {
  const entry = pricing.sectors[sector];
  if (!entry) return 0;

  let total = 0;
  for (let h = 0; h < durationHours; h++) {
    const hour = startHour + h;
    const price = hour >= pricing.eveningStartHour ? entry.eveningPrice : entry.dayPrice;
    total += price;
  }
  return total;
}

export function getDurationDiscountPercent(pricing: PricingConfig, durationHours: number): number {
  const safeHours = Math.max(1, Math.round(durationHours));

  let best = 0;
  for (const rule of pricing.durationDiscountRules ?? []) {
    const inLowerBound = safeHours >= rule.minHours;
    const inUpperBound = rule.maxHours === null || safeHours <= rule.maxHours;
    if (!inLowerBound || !inUpperBound) continue;
    best = Math.max(best, Math.max(0, Math.min(100, Math.round(rule.discountPercent))));
  }

  return best;
}

export function getEffectiveDiscountPercent(personalDiscountPercent: number, durationDiscountPercent: number): number {
  const personal = Math.max(0, Math.min(100, Math.round(personalDiscountPercent)));
  const duration = Math.max(0, Math.min(100, Math.round(durationDiscountPercent)));
  return Math.max(personal, duration);
}

export { SECTOR_KEYS };
