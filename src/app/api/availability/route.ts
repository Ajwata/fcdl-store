import { NextResponse } from "next/server";

import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { getBlockedSlots } from "@/lib/blocked-slots";
import { serviceUnavailable } from "@/lib/api-errors";

function hasNotEnded(date: string, endTime: string): boolean {
  return new Date(`${date}T${endTime}:00`).getTime() > Date.now();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = (searchParams.get("date") ?? "").trim();
    const sector = (searchParams.get("sector") ?? "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
    }

    const [bookings, blockedSlots] = await Promise.all([
      autoCompleteExpiredPaidBookings(),
      getBlockedSlots(date, sector || undefined),
    ]);

    const bookingSlots = bookings
      .filter((item) => item.status !== "cancelled")
      .filter((item) => item.status !== "completed" || hasNotEnded(item.date, item.endTime))
      .filter((item) => item.date === date)
      .filter((item) => (sector ? item.sector === sector : true))
      .map((item) => ({
        id: item.id,
        date: item.date,
        sector: item.sector,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        paymentStatus: item.paymentStatus,
        bookedBy: item.clientName?.trim() || item.clientPhone,
      }));

    const manualBlocks = blockedSlots.map((b) => ({
      id: b.id,
      date: b.date,
      sector: b.sector,
      startTime: b.startTime,
      endTime: b.endTime,
      status: "blocked" as const,
      paymentStatus: "paid" as const, // treated as occupied by the booking form
      bookedBy: b.reason?.trim() ? `Блок: ${b.reason.trim()}` : "Заблоковано адміністратором",
    }));

    const slots = [...bookingSlots, ...manualBlocks].sort((a, b) => {
      if (a.sector !== b.sector) return a.sector.localeCompare(b.sector);
      return a.startTime.localeCompare(b.startTime);
    });

    return NextResponse.json({ slots });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити доступні слоти", error);
  }
}

