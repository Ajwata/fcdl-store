import { promises as fs } from "node:fs";
import path from "node:path";

import type { Booking } from "@/lib/bookings";
import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

export const REFERRAL_COMMISSION_RATE = 0.05;

const referralsPath = path.join(process.cwd(), "src", "data", "referrals.json");

type ReferralFileRecord = {
  clientPhone: string;
  managerId: string;
  managerLogin: string;
  managerName: string;
  assignedAt: string;
  assignedById?: string;
};

export type ReferralAssignment = ReferralFileRecord & {
  clientPhoneKey: string;
};

export type ReferralDeal = {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  managerId: string;
  managerLogin: string;
  managerName: string;
  date: string;
  totalPrice: number;
  commission: number;
};

export type ManagerReferralStats = {
  managerId: string;
  managerLogin: string;
  managerName: string;
  referredClients: number;
  clientsWithDeals: number;
  dealsCount: number;
  commissionTotal: number;
};

export type ReferralReport = {
  managerStats: ManagerReferralStats[];
  deals: ReferralDeal[];
  totals: {
    referredClients: number;
    clientsWithDeals: number;
    dealsCount: number;
    commissionTotal: number;
  };
};

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

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

export async function getReferralAssignments(): Promise<ReferralAssignment[]> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const rows = await prisma.referralAssignment.findMany({ orderBy: [{ assignedAt: "desc" }] });
    return rows.map((row: {
      clientPhone: string;
      clientPhoneKey: string;
      managerId: string;
      managerLogin: string;
      managerName: string;
      assignedAt: Date;
      assignedById: string | null;
    }) => ({
      clientPhone: row.clientPhone,
      clientPhoneKey: row.clientPhoneKey,
      managerId: row.managerId,
      managerLogin: row.managerLogin,
      managerName: row.managerName,
      assignedAt: row.assignedAt.toISOString(),
      assignedById: row.assignedById ?? undefined,
    }));
  }

  const rows = await readJsonFile<ReferralFileRecord[]>(referralsPath, []);
  return rows.map((row) => ({
    ...row,
    clientPhoneKey: phoneKey(row.clientPhone),
  }));
}

export async function upsertReferralAssignment(input: {
  clientPhone: string;
  managerId: string;
  managerLogin: string;
  managerName: string;
  assignedById?: string;
}): Promise<ReferralAssignment> {
  const normalizedPhone = input.clientPhone.trim();
  const key = phoneKey(normalizedPhone);
  if (!key) {
    throw new Error("Некоректний номер телефону клієнта");
  }

  const current = await getReferralAssignments();
  const now = new Date().toISOString();
  const payload: ReferralAssignment = {
    clientPhone: normalizedPhone,
    clientPhoneKey: key,
    managerId: input.managerId,
    managerLogin: input.managerLogin,
    managerName: input.managerName,
    assignedAt: now,
    assignedById: input.assignedById,
  };

  const next = current.filter((item) => item.clientPhoneKey !== key);
  next.push(payload);

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.referralAssignment.upsert({
      where: { clientPhoneKey: key },
      create: {
        clientPhoneKey: key,
        clientPhone: normalizedPhone,
        managerId: input.managerId,
        managerLogin: input.managerLogin,
        managerName: input.managerName,
        assignedAt: new Date(now),
        assignedById: input.assignedById ?? null,
      },
      update: {
        clientPhone: normalizedPhone,
        managerId: input.managerId,
        managerLogin: input.managerLogin,
        managerName: input.managerName,
        assignedAt: new Date(now),
        assignedById: input.assignedById ?? null,
      },
    });
    return payload;
  }

  await writeJsonFile(
    referralsPath,
    next.map(({ clientPhoneKey, ...rest }) => rest),
  );

  return payload;
}

export function buildReferralReport(bookings: Booking[], assignments: ReferralAssignment[]): ReferralReport {
  const assignmentByPhone = new Map(assignments.map((item) => [item.clientPhoneKey, item]));
  const statsMap = new Map<string, ManagerReferralStats>();

  for (const assignment of assignments) {
    if (!statsMap.has(assignment.managerId)) {
      statsMap.set(assignment.managerId, {
        managerId: assignment.managerId,
        managerLogin: assignment.managerLogin,
        managerName: assignment.managerName,
        referredClients: 0,
        clientsWithDeals: 0,
        dealsCount: 0,
        commissionTotal: 0,
      });
    }
    const stat = statsMap.get(assignment.managerId)!;
    stat.referredClients += 1;
  }

  const deals: ReferralDeal[] = [];
  const clientsWithDealsByManager = new Map<string, Set<string>>();

  for (const booking of bookings) {
    if (booking.status !== "completed" || booking.paymentStatus !== "paid") {
      continue;
    }

    const assignment = assignmentByPhone.get(phoneKey(booking.clientPhone));
    if (!assignment) {
      continue;
    }

    // Count only deals created after client assignment.
    if (new Date(booking.createdAt).getTime() < new Date(assignment.assignedAt).getTime()) {
      continue;
    }

    const commission = Math.round(booking.totalPrice * REFERRAL_COMMISSION_RATE);
    deals.push({
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      managerId: assignment.managerId,
      managerLogin: assignment.managerLogin,
      managerName: assignment.managerName,
      date: booking.date,
      totalPrice: booking.totalPrice,
      commission,
    });

    if (!statsMap.has(assignment.managerId)) {
      statsMap.set(assignment.managerId, {
        managerId: assignment.managerId,
        managerLogin: assignment.managerLogin,
        managerName: assignment.managerName,
        referredClients: 0,
        clientsWithDeals: 0,
        dealsCount: 0,
        commissionTotal: 0,
      });
    }

    const stat = statsMap.get(assignment.managerId)!;
    stat.dealsCount += 1;
    stat.commissionTotal += commission;

    if (!clientsWithDealsByManager.has(assignment.managerId)) {
      clientsWithDealsByManager.set(assignment.managerId, new Set<string>());
    }
    clientsWithDealsByManager.get(assignment.managerId)!.add(phoneKey(booking.clientPhone));
  }

  for (const [managerId, clientsSet] of clientsWithDealsByManager.entries()) {
    const stat = statsMap.get(managerId);
    if (stat) {
      stat.clientsWithDeals = clientsSet.size;
    }
  }

  const managerStats = Array.from(statsMap.values()).sort((a, b) => b.commissionTotal - a.commissionTotal);

  const totals = {
    referredClients: assignments.length,
    clientsWithDeals: new Set(deals.map((item) => phoneKey(item.clientPhone))).size,
    dealsCount: deals.length,
    commissionTotal: deals.reduce((sum, item) => sum + item.commission, 0),
  };

  deals.sort((a, b) => b.date.localeCompare(a.date));

  return {
    managerStats,
    deals,
    totals,
  };
}
