import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

function hasNotEnded(date: string, endTime: string): boolean {
  return new Date(`${date}T${endTime}:00`).getTime() > Date.now();
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") ?? "").trim();
  const sector = (searchParams.get("sector") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !sector) {
    return NextResponse.json({ error: "Некоректні параметри" }, { status: 400 });
  }

  const slots = (await autoCompleteExpiredPaidBookings())
    .filter((item) => item.status !== "cancelled")
    .filter((item) => item.status !== "completed" || hasNotEnded(item.date, item.endTime))
    .filter((item) => item.paymentStatus === "paid" || item.paymentStatus === "verification")
    .filter((item) => item.date === date && item.sector === sector)
    .map((item) => ({
      id: item.id,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status,
    }))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return NextResponse.json({ slots });
}
