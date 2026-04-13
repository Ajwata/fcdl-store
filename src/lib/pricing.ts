import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

export type SectorPricingEntry = {
  dayPrice: number;
  eveningPrice: number;
};

export type PricingConfig = {
  eveningStartHour: number;
  sectors: Record<string, SectorPricingEntry>;
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
};

const pricingFilePath = path.join(process.cwd(), "src", "data", "pricing.json");

export async function getPricing(): Promise<PricingConfig> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.appConfig.findUnique({ where: { key: "pricing" } });
    const parsed = (row?.value ?? {}) as Partial<PricingConfig>;
    return {
      eveningStartHour: parsed.eveningStartHour ?? pricingDefaults.eveningStartHour,
      sectors: {
        ...pricingDefaults.sectors,
        ...(parsed.sectors ?? {}),
      },
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
    };
  } catch {
    return pricingDefaults;
  }
}

export async function savePricing(config: PricingConfig): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.appConfig.upsert({
      where: { key: "pricing" },
      create: {
        key: "pricing",
        value: config,
        updatedAt: new Date(),
      },
      update: {
        value: config,
        updatedAt: new Date(),
      },
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

export { SECTOR_KEYS };
