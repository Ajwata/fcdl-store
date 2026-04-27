import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { addBlockedSlotsRange } from "@/lib/blocked-slots";
import { serviceUnavailable } from "@/lib/api-errors";

const SECTORS = ["№1", "№2", "№3", "№4"];
const TIME_RE = /^\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/admin/blocked-slots/range
 * Body: { dateFrom, dateTo, sectors, slots: [{startTime, endTime}] }
 * Adds (merges) blocked slots across the date range for all listed sectors.
 */
export async function POST(request: Request) {
  const auth = await requireAdminSession({ unauthorizedMessage: "Unauthorized" });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = (await request.json()) as {
    dateFrom?: string;
    dateTo?: string;
    sectors?: unknown[];
    slots?: Array<{ startTime?: string; endTime?: string; reason?: string }>;
  };

  const dateFrom = (body.dateFrom ?? "").trim();
  const dateTo = (body.dateTo ?? "").trim();

  if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
    return NextResponse.json({ error: "Некоректні дати" }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ error: "Дата «від» має бути раніше за дату «до»" }, { status: 400 });
  }

  const diffDays =
    (new Date(`${dateTo}T00:00:00`).getTime() - new Date(`${dateFrom}T00:00:00`).getTime()) /
    86_400_000;
  if (diffDays > 90) {
    return NextResponse.json({ error: "Діапазон не може перевищувати 90 днів" }, { status: 400 });
  }

  const sectors = Array.isArray(body.sectors)
    ? body.sectors.filter((s): s is string => typeof s === "string" && SECTORS.includes(s))
    : [];
  if (sectors.length === 0) {
    return NextResponse.json({ error: "Оберіть хоча б один сектор" }, { status: 400 });
  }

  const rawSlots = Array.isArray(body.slots) ? body.slots : [];
  const validSlots = rawSlots.filter(
    (s): s is { startTime: string; endTime: string; reason?: string } =>
      typeof s.startTime === "string" &&
      TIME_RE.test(s.startTime) &&
      typeof s.endTime === "string" &&
      TIME_RE.test(s.endTime),
  );
  if (validSlots.length === 0) {
    return NextResponse.json({ error: "Оберіть хоча б одну годину" }, { status: 400 });
  }

  const actorReason = `Заблокував: ${session.name}`;
  const normalizedSlots = validSlots.map((slot) => ({
    ...slot,
    reason: slot.reason?.trim() ? `${actorReason}. ${slot.reason.trim()}` : actorReason,
  }));

  try {
    const added = await addBlockedSlotsRange(dateFrom, dateTo, sectors, normalizedSlots);
    return NextResponse.json({ added });
  } catch (error) {
    return serviceUnavailable("Не вдалося зберегти блокування у діапазоні", error);
  }
}
