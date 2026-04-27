import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { autoCompleteExpiredPaidBookings, isBookingOwnedByUser } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { addClientNotification, createClientReview, getClientReviewByBooking } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

function hasEndedByTime(date: string, endTime: string): boolean {
  return new Date(`${date}T${endTime}:00`).getTime() <= Date.now();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getRequestIp(request);
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

  const rateLimit = await checkRateLimit(`account-review:${payload.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 12,
    blockMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато запитів на відгуки. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const bookings = await autoCompleteExpiredPaidBookings();
  const booking = bookings.find((item) => item.id === id);
  if (!booking) {
    return NextResponse.json({ error: "Бронювання не знайдено" }, { status: 404 });
  }

  if (!isBookingOwnedByUser(booking, payload.uid, user.phone)) {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  if (!hasEndedByTime(booking.date, booking.endTime) || booking.status === "cancelled") {
    return NextResponse.json({ error: "Відгук доступний тільки після завершеної гри" }, { status: 400 });
  }

  if (booking.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Відгук доступний тільки для оплаченого бронювання" }, { status: 400 });
  }

  const existingReview = await getClientReviewByBooking(payload.uid, user.phone, booking.id);
  if (existingReview) {
    return NextResponse.json({ error: "Відгук вже залишено для цього бронювання" }, { status: 409 });
  }

  const body = (await request.json()) as { rating?: number; text?: string };
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Оцiнка має бути вiд 1 до 5" }, { status: 400 });
  }

  const review = await createClientReview(payload.uid, user.phone, booking.id, body.rating, body.text ?? "");

  await addClientNotification(
    payload.uid,
    user.phone,
    "Дякуємо за відгук",
    "Ваш відгук успішно збережено. Це допомагає покращувати сервіс.",
    "success",
  );

  return NextResponse.json({ review });
}
