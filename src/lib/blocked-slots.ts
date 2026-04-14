import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

const dataPath = path.join(process.cwd(), "src", "data", "blocked-slots.json");

export type BlockedSlot = {
  id: string;
  sector: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  reason?: string;
  createdAt: string;
};

function fromDb(row: {
  id: string;
  sector: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  createdAt: Date;
}): BlockedSlot {
  return {
    id: row.id,
    sector: row.sector,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    reason: row.reason ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

async function readJson(): Promise<BlockedSlot[]> {
  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(raw) as BlockedSlot[];
  } catch {
    return [];
  }
}

async function writeJson(slots: BlockedSlot[]): Promise<void> {
  await fs.writeFile(dataPath, `${JSON.stringify(slots, null, 2)}\n`, "utf-8");
}

/** Get all blocked slots for a specific date (optionally filter by sector). */
export async function getBlockedSlots(date: string, sector?: string): Promise<BlockedSlot[]> {
  if (isDatabaseEnabled()) {
    const where = sector ? { date, sector } : { date };
    const rows = await getPrismaClient().blockedSlot.findMany({ where, orderBy: { startTime: "asc" } });
    return rows.map(fromDb);
  }

  const all = await readJson();
  return all.filter((s) => s.date === date && (sector ? s.sector === sector : true));
}

/**
 * Replace all blocked slots for a given date+sector with the provided list.
 * Pass an empty array to clear all blocks for that date+sector.
 */
export async function setBlockedSlots(
  date: string,
  sector: string,
  slots: Array<{ startTime: string; endTime: string; reason?: string }>,
): Promise<BlockedSlot[]> {
  const now = new Date();
  const newSlots: BlockedSlot[] = slots.map((s) => ({
    id: `block-${randomUUID()}`,
    sector,
    date,
    startTime: s.startTime,
    endTime: s.endTime,
    reason: s.reason,
    createdAt: now.toISOString(),
  }));

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.$transaction([
      prisma.blockedSlot.deleteMany({ where: { date, sector } }),
      ...newSlots.map((s) =>
        prisma.blockedSlot.create({
          data: {
            id: s.id,
            sector: s.sector,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            reason: s.reason ?? null,
            createdAt: now,
          },
        }),
      ),
    ]);
    return newSlots;
  }

  const all = await readJson();
  const kept = all.filter((s) => !(s.date === date && s.sector === sector));
  await writeJson([...kept, ...newSlots]);
  return newSlots;
}
