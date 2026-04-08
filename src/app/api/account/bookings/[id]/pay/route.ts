import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBookings, isBookingOwnedByUser, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { addClientNotification } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

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

  if (booking.paymentStatus === "paid") {
    return NextResponse.json({ error: "Рахунок вже оплачено" }, { status: 400 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Не можна оплатити скасоване бронювання" }, { status: 400 });
  }

  const receiptId = `R-${Date.now().toString().slice(-8)}`;
  bookings[index] = {
    ...booking,
    paymentStatus: "paid",
    notes: `${booking.notes ? `${booking.notes}. ` : ""}Підтверджено клієнтом: оплата готівкою/IBAN (${receiptId})`,
  };
  await saveBookings(bookings);

  await addClientNotification(
    payload.uid,
    user.phone,
    "Оплата підтверджена",
    `Ми зафіксували оплату за бронювання ${bookings[index].date} (${bookings[index].totalPrice} грн).`,
    "success",
  );

  return NextResponse.json({ booking: bookings[index], receiptId });
}
