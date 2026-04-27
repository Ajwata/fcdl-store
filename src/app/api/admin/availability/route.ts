import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { getBlockedSlots } from "@/lib/blocked-slots";
import { getReferralAssignments } from "@/lib/referrals";

function hasNotEnded(date: string, endTime: string): boolean {
  return new Date(`${date}T${endTime}:00`).getTime() > Date.now();
}

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();
  const sector = (searchParams.get("sector") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
  }

  try {
    const [bookings, blockedSlots, assignments] = await Promise.all([
      autoCompleteExpiredPaidBookings(),
      getBlockedSlots(date, sector || undefined),
      session.role === "superadmin" ? getReferralAssignments() : Promise.resolve([]),
    ]);

  const assignmentByPhoneKey = new Map(assignments.map((item) => [item.clientPhoneKey, item]));

  const bookingSlots = bookings
    .filter((item) => item.status !== "cancelled")
    .filter((item) => item.status !== "completed" || hasNotEnded(item.date, item.endTime))
    .filter((item) => item.date === date)
    .filter((item) => (sector ? item.sector === sector : true))
    .map((item) => {
      const assignment = assignmentByPhoneKey.get(phoneKey(item.clientPhone));
      const managerName = assignment?.managerName?.trim();
      const bookedBy =
        session.role === "superadmin" && managerName
          ? `Менеджер: ${managerName}`
          : undefined;

      return {
        id: item.id,
        date: item.date,
        sector: item.sector,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        paymentStatus: item.paymentStatus,
        bookedBy,
      };
    });

  const manualBlocks = blockedSlots.map((b) => ({
    id: b.id,
    date: b.date,
    sector: b.sector,
    startTime: b.startTime,
    endTime: b.endTime,
    status: "blocked" as const,
    paymentStatus: "paid" as const,
    bookedBy: b.reason?.trim() ? `Блок: ${b.reason.trim()}` : "Заблоковано: автор не збережений",
  }));

  const slots = [...bookingSlots, ...manualBlocks].sort((a, b) => {
    if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
    return a.startTime.localeCompare(b.startTime);
  });

    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не вдалося завантажити доступність для адміністратора",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}
