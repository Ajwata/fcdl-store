import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { getBlockedSlots, setBlockedSlots } from "@/lib/blocked-slots";
import { serviceUnavailable } from "@/lib/api-errors";

/** GET /api/admin/blocked-slots?date=YYYY-MM-DD&sector=... */
export async function GET(request: Request) {
  const auth = await requireAdminSession({ unauthorizedMessage: "Unauthorized" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();
  const sector = (searchParams.get("sector") ?? "").trim() || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
  }

  try {
    const slots = await getBlockedSlots(date, sector);
    return NextResponse.json({ slots });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити заблоковані слоти", error);
  }
}

/**
 * POST /api/admin/blocked-slots
 * Body: { date, sector, slots: [{startTime, endTime, reason?}] }
 * Replaces all blocked slots for that date+sector.
 */
export async function POST(request: Request) {
  const auth = await requireAdminSession({ unauthorizedMessage: "Unauthorized" });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = (await request.json()) as {
    date?: string;
    sector?: string;
    slots?: Array<{ startTime?: string; endTime?: string; reason?: string }>;
  };

  const date = (body.date ?? "").trim();
  const sector = (body.sector ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
  }
  if (!sector) {
    return NextResponse.json({ error: "Вкажіть сектор" }, { status: 400 });
  }

  const rawSlots = Array.isArray(body.slots) ? body.slots : [];
  const validSlots: Array<{ startTime: string; endTime: string; reason?: string }> = rawSlots
    .filter(
      (s): s is { startTime: string; endTime: string; reason?: string } =>
        typeof s.startTime === "string" &&
        /^\d{2}:\d{2}$/.test(s.startTime) &&
        typeof s.endTime === "string" &&
        /^\d{2}:\d{2}$/.test(s.endTime),
    );

  const actorReason = `Заблокував: ${session.name}`;
  const normalizedSlots = validSlots.map((slot) => ({
    ...slot,
    reason: slot.reason?.trim() ? `${actorReason}. ${slot.reason.trim()}` : actorReason,
  }));

  try {
    const saved = await setBlockedSlots(date, sector, normalizedSlots);
    return NextResponse.json({ slots: saved });
  } catch (error) {
    return serviceUnavailable("Не вдалося зберегти заблоковані слоти", error);
  }
}
