import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  try {
    const bookings = await autoCompleteExpiredPaidBookings();
    return NextResponse.json({ bookings });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити бронювання", error);
  }
}
