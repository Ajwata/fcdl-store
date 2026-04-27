import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const bookings = await autoCompleteExpiredPaidBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити бронювання", error);
  }
}
