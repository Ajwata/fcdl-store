import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBlockedSlots, setBlockedSlots } from "@/lib/blocked-slots";
import { verifySessionToken } from "@/lib/auth";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  return verifySessionToken(token);
}

/** GET /api/admin/blocked-slots?date=YYYY-MM-DD&sector=... */
export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();
  const sector = (searchParams.get("sector") ?? "").trim() || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
  }

  const slots = await getBlockedSlots(date, sector);
  return NextResponse.json({ slots });
}

/**
 * POST /api/admin/blocked-slots
 * Body: { date, sector, slots: [{startTime, endTime, reason?}] }
 * Replaces all blocked slots for that date+sector.
 */
export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const saved = await setBlockedSlots(date, sector, validSlots);
  return NextResponse.json({ slots: saved });
}
