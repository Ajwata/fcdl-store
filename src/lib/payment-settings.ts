import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

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
    const row = await prisma.paymentSettings.findUnique({ where: { id: "default" } });
    if (!row) {
      const created = await prisma.paymentSettings.create({
        data: {
          id: "default",
          adminDecisionHours: paymentSettingsDefaults.adminDecisionHours,
          paymentWindowRules: paymentSettingsDefaults.paymentWindowRules,
          updatedAt: new Date(),
        },
      });

      return {
        adminDecisionHours: created.adminDecisionHours,
        paymentWindowRules: sanitizeRules(created.paymentWindowRules as PaymentWindowRule[]),
      };
    }

    return {
      adminDecisionHours: Math.max(1, Math.floor(row.adminDecisionHours)),
      paymentWindowRules: sanitizeRules(row.paymentWindowRules as PaymentWindowRule[]),
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
    await prisma.paymentSettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        adminDecisionHours: next.adminDecisionHours,
        paymentWindowRules: next.paymentWindowRules,
        updatedAt: new Date(),
      },
      update: {
        adminDecisionHours: next.adminDecisionHours,
        paymentWindowRules: next.paymentWindowRules,
        updatedAt: new Date(),
      },
    });
    return next;
  }

  await writeJsonFile(paymentSettingsPath, next);
  return next;
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
