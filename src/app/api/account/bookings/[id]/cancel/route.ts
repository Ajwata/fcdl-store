import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBookings, isBookingOwnedByUser, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

function isFutureBooking(date: string, startTime: string): boolean {
  const bookingDate = new Date(`${date}T${startTime}:00`);
  return bookingDate.getTime() > Date.now();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const user = await getClientUserById(payload.uid);
  if (!user) {
    return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
  }

  const { id } = await params;
  const bookings = await getBookings();
  const index = bookings.findIndex((item) => item.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Бронювання не знайдено" }, { status: 404 });
  }

  const booking = bookings[index];
  if (!isBookingOwnedByUser(booking, payload.uid, user.phone)) {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Бронювання вже скасовано" }, { status: 400 });
  }

  if (booking.status === "completed") {
    return NextResponse.json({ error: "Не можна скасувати завершене бронювання" }, { status: 400 });
  }

  if (!isFutureBooking(booking.date, booking.startTime)) {
    return NextResponse.json({ error: "Скасування можливе тільки для майбутніх бронювань" }, { status: 400 });
  }

  bookings[index] = { ...booking, status: "cancelled", notes: booking.notes || "Скасовано клієнтом" };
  await saveBookings(bookings);

  return NextResponse.json({ booking: bookings[index] });
}
