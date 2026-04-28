import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dataDir = path.join(process.cwd(), "src", "data");

function phoneKey(phone) {
  return String(phone ?? "").replace(/\D/g, "");
}

function parseEnvLines(raw) {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function loadEnvFile(fileName) {
  try {
    const raw = await readFile(path.join(process.cwd(), fileName), "utf-8");
    parseEnvLines(raw);
  } catch {
    return;
  }
}

async function readJson(fileName, fallback) {
  try {
    const raw = await readFile(path.join(dataDir, fileName), "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toDate(value, fallback = new Date()) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Fill .env.local before import.");
  }

  const [
    clientUsers,
    clientSmsCodes,
    bookings,
    clientDiscounts,
    clientNotifications,
    clientReviews,
    paymentSettings,
    referrals,
    adminUsers,
    pricing,
    cmsContent,
  ] = await Promise.all([
    readJson("client-users.json", []),
    readJson("client-sms-codes.json", []),
    readJson("bookings.json", []),
    readJson("client-discounts.json", []),
    readJson("client-notifications.json", []),
    readJson("client-reviews.json", []),
    readJson("payment-settings.json", null),
    readJson("referrals.json", []),
    readJson("admin-users.json", []),
    readJson("pricing.json", null),
    readJson("cms-content.json", null),
  ]);

  for (const user of clientUsers) {
    await prisma.clientUser.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email ?? null,
        avatarUrl: user.avatarUrl ?? null,
        passwordHash: user.passwordHash ?? null,
        createdAt: toDate(user.createdAt, new Date()),
        lastLoginAt: toDate(user.lastLoginAt, new Date()),
      },
      update: {
        phone: user.phone,
        name: user.name,
        email: user.email ?? null,
        avatarUrl: user.avatarUrl ?? null,
        passwordHash: user.passwordHash ?? null,
        createdAt: toDate(user.createdAt, new Date()),
        lastLoginAt: toDate(user.lastLoginAt, new Date()),
      },
    });
  }

  for (const code of clientSmsCodes) {
    if (!code.phone || !code.verifyId || !code.expiresAt) continue;
    await prisma.clientSmsCode.upsert({
      where: { phone: code.phone },
      create: {
        phone: code.phone,
        verifyId: code.verifyId,
        expiresAt: toDate(code.expiresAt, new Date()),
        createdAt: toDate(code.createdAt, new Date()),
      },
      update: {
        verifyId: code.verifyId,
        expiresAt: toDate(code.expiresAt, new Date()),
        createdAt: toDate(code.createdAt, new Date()),
      },
    });
  }

  for (const booking of bookings) {
    await prisma.booking.upsert({
      where: { id: booking.id },
      create: {
        id: booking.id,
        clientUserId: booking.clientUserId ?? null,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        clientPhoneKey: phoneKey(booking.clientPhone),
        clientEmail: booking.clientEmail ?? "",
        sector: booking.sector,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours: booking.durationHours,
        pricePerHour: booking.pricePerHour,
        totalPrice: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod ?? null,
        paymentProofUrl: booking.paymentProofUrl ?? null,
        paymentProofUploadedAt: booking.paymentProofUploadedAt ? toDate(booking.paymentProofUploadedAt) : null,
        adminDecisionDueAt: booking.adminDecisionDueAt ? toDate(booking.adminDecisionDueAt) : null,
        confirmedAt: booking.confirmedAt ? toDate(booking.confirmedAt) : null,
        paymentDueAt: booking.paymentDueAt ? toDate(booking.paymentDueAt) : null,
        createdAt: toDate(booking.createdAt, new Date()),
        notes: booking.notes ?? "",
      },
      update: {
        clientUserId: booking.clientUserId ?? null,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        clientPhoneKey: phoneKey(booking.clientPhone),
        clientEmail: booking.clientEmail ?? "",
        sector: booking.sector,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationHours: booking.durationHours,
        pricePerHour: booking.pricePerHour,
        totalPrice: booking.totalPrice,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod ?? null,
        paymentProofUrl: booking.paymentProofUrl ?? null,
        paymentProofUploadedAt: booking.paymentProofUploadedAt ? toDate(booking.paymentProofUploadedAt) : null,
        adminDecisionDueAt: booking.adminDecisionDueAt ? toDate(booking.adminDecisionDueAt) : null,
        confirmedAt: booking.confirmedAt ? toDate(booking.confirmedAt) : null,
        paymentDueAt: booking.paymentDueAt ? toDate(booking.paymentDueAt) : null,
        createdAt: toDate(booking.createdAt, new Date()),
        notes: booking.notes ?? "",
      },
    });
  }

  for (const discount of clientDiscounts) {
    const clientPhone = discount.clientPhone ?? "";
    const clientPhoneKey = phoneKey(clientPhone);
    if (!clientPhoneKey) continue;

    await prisma.clientDiscount.upsert({
      where: { clientPhoneKey },
      create: {
        clientPhoneKey,
        clientPhone,
        discountPercent: Number(discount.discountPercent ?? 0),
        updatedAt: toDate(discount.updatedAt, new Date()),
        updatedById: discount.updatedById ?? null,
      },
      update: {
        clientPhone,
        discountPercent: Number(discount.discountPercent ?? 0),
        updatedAt: toDate(discount.updatedAt, new Date()),
        updatedById: discount.updatedById ?? null,
      },
    });
  }

  for (const notification of clientNotifications) {
    await prisma.clientNotification.upsert({
      where: { id: notification.id },
      create: {
        id: notification.id,
        clientUserId: notification.clientUserId ?? null,
        phone: notification.phone,
        phoneKey: phoneKey(notification.phone),
        title: notification.title,
        message: notification.message,
        kind: notification.kind,
        isRead: Boolean(notification.isRead),
        readAt: notification.readAt ? toDate(notification.readAt) : null,
        createdAt: toDate(notification.createdAt, new Date()),
      },
      update: {
        clientUserId: notification.clientUserId ?? null,
        phone: notification.phone,
        phoneKey: phoneKey(notification.phone),
        title: notification.title,
        message: notification.message,
        kind: notification.kind,
        isRead: Boolean(notification.isRead),
        readAt: notification.readAt ? toDate(notification.readAt) : null,
        createdAt: toDate(notification.createdAt, new Date()),
      },
    });
  }

  for (const review of clientReviews) {
    await prisma.clientReview.upsert({
      where: { id: review.id },
      create: {
        id: review.id,
        bookingId: review.bookingId,
        clientUserId: review.clientUserId ?? null,
        phone: review.phone,
        phoneKey: phoneKey(review.phone),
        rating: Number(review.rating ?? 0),
        text: review.text ?? "",
        createdAt: toDate(review.createdAt, new Date()),
      },
      update: {
        bookingId: review.bookingId,
        clientUserId: review.clientUserId ?? null,
        phone: review.phone,
        phoneKey: phoneKey(review.phone),
        rating: Number(review.rating ?? 0),
        text: review.text ?? "",
        createdAt: toDate(review.createdAt, new Date()),
      },
    });
  }

  if (paymentSettings) {
    await prisma.$transaction(async (tx) => {
      await tx.paymentSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          adminDecisionHours: Number(paymentSettings.adminDecisionHours ?? 12),
          updatedAt: new Date(),
        },
        update: {
          adminDecisionHours: Number(paymentSettings.adminDecisionHours ?? 12),
          updatedAt: new Date(),
        },
      });

      await tx.paymentWindowRule.deleteMany({ where: { settingsId: "default" } });

      const rules = Array.isArray(paymentSettings.paymentWindowRules) ? paymentSettings.paymentWindowRules : [];
      if (rules.length > 0) {
        await tx.paymentWindowRule.createMany({
          data: rules.map((rule, index) => ({
            settingsId: "default",
            minDaysBeforeStart: Number(rule.minDaysBeforeStart ?? 0),
            maxDaysBeforeStart: rule.maxDaysBeforeStart == null ? null : Number(rule.maxDaysBeforeStart),
            paymentHours: Number(rule.paymentHours ?? 1),
            sortOrder: index,
          })),
        });
      }
    });
  }

  for (const referral of referrals) {
    const clientPhone = referral.clientPhone ?? "";
    const clientPhoneKey = phoneKey(clientPhone);
    if (!clientPhoneKey) continue;

    await prisma.referralAssignment.upsert({
      where: { clientPhoneKey },
      create: {
        clientPhoneKey,
        clientPhone,
        managerId: referral.managerId,
        managerLogin: referral.managerLogin,
        managerName: referral.managerName,
        assignedAt: toDate(referral.assignedAt, new Date()),
        assignedById: referral.assignedById ?? null,
      },
      update: {
        clientPhone,
        managerId: referral.managerId,
        managerLogin: referral.managerLogin,
        managerName: referral.managerName,
        assignedAt: toDate(referral.assignedAt, new Date()),
        assignedById: referral.assignedById ?? null,
      },
    });
  }

  for (const admin of adminUsers) {
    await prisma.adminUser.upsert({
      where: { id: admin.id },
      create: {
        id: admin.id,
        login: admin.login,
        name: admin.name,
        role: admin.role,
        passwordHash: admin.passwordHash,
        createdAt: toDate(admin.createdAt, new Date(0)),
      },
      update: {
        login: admin.login,
        name: admin.name,
        role: admin.role,
        passwordHash: admin.passwordHash,
        createdAt: toDate(admin.createdAt, new Date(0)),
      },
    });
  }

  if (pricing) {
    await prisma.$transaction(async (tx) => {
      await tx.pricingSettings.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          eveningStartHour: Number(pricing.eveningStartHour ?? 18),
          updatedAt: new Date(),
        },
        update: {
          eveningStartHour: Number(pricing.eveningStartHour ?? 18),
          updatedAt: new Date(),
        },
      });

      await tx.pricingSector.deleteMany({ where: { settingsId: "default" } });
      const sectors = Object.entries(pricing.sectors ?? {});
      if (sectors.length > 0) {
        await tx.pricingSector.createMany({
          data: sectors.map(([sector, prices]) => ({
            settingsId: "default",
            sector,
            dayPrice: Number(prices.dayPrice ?? 0),
            eveningPrice: Number(prices.eveningPrice ?? 0),
            updatedAt: new Date(),
          })),
        });
      }

      await tx.pricingDurationRule.deleteMany({ where: { settingsId: "default" } });
      const durationRules = Array.isArray(pricing.durationDiscountRules) ? pricing.durationDiscountRules : [];
      if (durationRules.length > 0) {
        await tx.pricingDurationRule.createMany({
          data: durationRules.map((rule, index) => ({
            settingsId: "default",
            minHours: Number(rule.minHours ?? 1),
            maxHours: rule.maxHours == null ? null : Number(rule.maxHours),
            discountPercent: Number(rule.discountPercent ?? 0),
            sortOrder: index,
          })),
        });
      }
    });
  }

  if (cmsContent) {
    await prisma.cmsConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        content: cmsContent,
        updatedAt: new Date(),
      },
      update: {
        content: cmsContent,
        updatedAt: new Date(),
      },
    });
  }

  console.log("JSON import completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
