import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled, isStrictDatabaseMode } from "@/lib/prisma";

export type PaymentWindowRule = {
  minDaysBeforeStart: number;
  maxDaysBeforeStart: number | null;
  paymentHours: number;
};

export type PaymentSettings = {
  adminDecisionHours: number;
  paymentWindowRules: PaymentWindowRule[];
};

const paymentSettingsPath = path.join(process.cwd(), "src", "data", "payment-settings.json");

export const paymentSettingsDefaults: PaymentSettings = {
  adminDecisionHours: 12,
  paymentWindowRules: [
    { minDaysBeforeStart: 1, maxDaysBeforeStart: 2, paymentHours: 12 },
    { minDaysBeforeStart: 3, maxDaysBeforeStart: 5, paymentHours: 24 },
    { minDaysBeforeStart: 6, maxDaysBeforeStart: 9, paymentHours: 48 },
    { minDaysBeforeStart: 10, maxDaysBeforeStart: null, paymentHours: 72 },
  ],
};

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

function sanitizeRules(rules: PaymentWindowRule[]): PaymentWindowRule[] {
  const normalized = rules
    .map((rule) => ({
      minDaysBeforeStart: Math.max(0, Math.floor(rule.minDaysBeforeStart)),
      maxDaysBeforeStart:
        rule.maxDaysBeforeStart === null ? null : Math.max(0, Math.floor(rule.maxDaysBeforeStart)),
      paymentHours: Math.max(1, Math.floor(rule.paymentHours)),
    }))
    .sort((a, b) => a.minDaysBeforeStart - b.minDaysBeforeStart);

  return normalized;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.paymentSettings.findUnique({
      where: { id: "default" },
      include: {
        paymentWindowRules: {
          orderBy: [{ sortOrder: "asc" }],
        },
      },
    });
    if (!row) {
      if (isStrictDatabaseMode()) {
        throw new Error("Missing required payment settings row 'default' in strict database mode");
      }

      const created = await prisma.paymentSettings.create({
        data: {
          id: "default",
          adminDecisionHours: paymentSettingsDefaults.adminDecisionHours,
          updatedAt: new Date(),
          paymentWindowRules: {
            create: paymentSettingsDefaults.paymentWindowRules.map((rule, index) => ({
              minDaysBeforeStart: rule.minDaysBeforeStart,
              maxDaysBeforeStart: rule.maxDaysBeforeStart,
              paymentHours: rule.paymentHours,
              sortOrder: index,
            })),
          },
        },
        include: {
          paymentWindowRules: {
            orderBy: [{ sortOrder: "asc" }],
          },
        },
      });

      return {
        adminDecisionHours: created.adminDecisionHours,
        paymentWindowRules: sanitizeRules(
          created.paymentWindowRules.map((rule) => ({
            minDaysBeforeStart: rule.minDaysBeforeStart,
            maxDaysBeforeStart: rule.maxDaysBeforeStart,
            paymentHours: rule.paymentHours,
          })),
        ),
      };
    }

    const normalizedRules = row.paymentWindowRules.map((rule) => ({
      minDaysBeforeStart: rule.minDaysBeforeStart,
      maxDaysBeforeStart: rule.maxDaysBeforeStart,
      paymentHours: rule.paymentHours,
    }));

    return {
      adminDecisionHours: Math.max(1, Math.floor(row.adminDecisionHours)),
      paymentWindowRules: sanitizeRules(normalizedRules),
    };
  }

  const raw = await readJsonFile<Partial<PaymentSettings>>(paymentSettingsPath, paymentSettingsDefaults);
  const rules = Array.isArray(raw.paymentWindowRules)
    ? sanitizeRules(raw.paymentWindowRules)
    : paymentSettingsDefaults.paymentWindowRules;

  return {
    adminDecisionHours: Math.max(1, Math.floor(raw.adminDecisionHours ?? paymentSettingsDefaults.adminDecisionHours)),
    paymentWindowRules: rules.length > 0 ? rules : paymentSettingsDefaults.paymentWindowRules,
  };
}

export async function savePaymentSettings(input: PaymentSettings): Promise<PaymentSettings> {
  const next: PaymentSettings = {
    adminDecisionHours: Math.max(1, Math.floor(input.adminDecisionHours)),
    paymentWindowRules: sanitizeRules(input.paymentWindowRules),
  };

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      await tx.paymentSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          adminDecisionHours: next.adminDecisionHours,
          updatedAt: new Date(),
        },
        update: {
          adminDecisionHours: next.adminDecisionHours,
          updatedAt: new Date(),
        },
      });

      await tx.paymentWindowRule.deleteMany({ where: { settingsId: "default" } });

      if (next.paymentWindowRules.length > 0) {
        await tx.paymentWindowRule.createMany({
          data: next.paymentWindowRules.map((rule, index) => ({
            settingsId: "default",
            minDaysBeforeStart: rule.minDaysBeforeStart,
            maxDaysBeforeStart: rule.maxDaysBeforeStart,
            paymentHours: rule.paymentHours,
            sortOrder: index,
          })),
        });
      }
    });
    return next;
  }

  await writeJsonFile(paymentSettingsPath, next);
  return next;
}

/**
 * Determine how many hours a client has to pay based on days until booking start.
 * @param date Game date (YYYY-MM-DD)
 * @param settings Payment settings
 * @returns Payment window in hours (e.g., 12, 24, 48, 72)
 */
export function getPaymentWindowHours(date: string, settings: PaymentSettings): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const gameDate = new Date(`${date}T00:00:00Z`);
  gameDate.setUTCHours(0, 0, 0, 0);

  const daysUntilStart = Math.floor((gameDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  // Find matching rule
  for (const rule of settings.paymentWindowRules) {
    const minOk = daysUntilStart >= rule.minDaysBeforeStart;
    const maxOk = rule.maxDaysBeforeStart === null || daysUntilStart <= rule.maxDaysBeforeStart;
    if (minOk && maxOk) {
      return rule.paymentHours;
    }
  }

  // Fallback: last rule or default
  if (settings.paymentWindowRules.length > 0) {
    return settings.paymentWindowRules[settings.paymentWindowRules.length - 1].paymentHours;
  }

  return 12; // 12 hours default
}

export function toBookingStartTimestamp(date: string, startTime: string): number {
  return new Date(`${date}T${startTime}:00`).getTime();
}

export function daysBeforeStart(fromTimestamp: number, bookingDate: string, bookingStartTime: string): number {
  const start = toBookingStartTimestamp(bookingDate, bookingStartTime);
  const diffMs = Math.max(0, start - fromTimestamp);
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

export function resolvePaymentWindowHours(settings: PaymentSettings, daysBefore: number): number {
  for (const rule of settings.paymentWindowRules) {
    const max = rule.maxDaysBeforeStart;
    const inRange = daysBefore >= rule.minDaysBeforeStart && (max === null || daysBefore <= max);
    if (inRange) return rule.paymentHours;
  }

  // If booking is less than one day before start, use the shortest configured window.
  return Math.min(...settings.paymentWindowRules.map((rule) => rule.paymentHours));
}
