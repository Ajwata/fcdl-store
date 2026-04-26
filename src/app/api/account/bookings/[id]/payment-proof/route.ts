import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBookings, isBookingOwnedByUser, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { notifyPaymentVerification } from "@/lib/telegram";

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

function detectPublicOrigin(request: Request): string {
  const envOrigin = process.env.PUBLIC_APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (envOrigin) return envOrigin.replace(/\/$/, "");

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.trim();
  const proto = forwardedProto || new URL(request.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

function normalizeReceiptUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
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

  const body = (await request.json().catch(() => ({}))) as { receiptUrl?: string };
  const normalizedReceiptUrl = normalizeReceiptUrl(body.receiptUrl ?? "");
  if (!normalizedReceiptUrl) {
    return NextResponse.json({ error: "Вкажіть коректне посилання на квитанцію (http/https)" }, { status: 400 });
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

  if (booking.status === "cancelled" || booking.status === "completed") {
    return NextResponse.json({ error: "Для цього бронювання не можна підтвердити оплату" }, { status: 400 });
  }

  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return NextResponse.json({ error: "Для цього бронювання не можна зафіксувати оплату" }, { status: 400 });
  }

  if (booking.paymentStatus !== "unpaid") {
    return NextResponse.json({ error: "Для цього бронювання оплата вже зафіксована" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const publicOrigin = detectPublicOrigin(request);
  const adminBookingUrl = new URL(`/admin/bookings?bookingId=${encodeURIComponent(booking.id)}`, publicOrigin).toString();

  bookings[index] = {
    ...booking,
    status: "confirmed",
    paymentStatus: "verification",
    paymentMethod: "iban",
    paymentProofUrl: normalizedReceiptUrl,
    paymentProofUploadedAt: nowIso,
    paymentDueAt: undefined,
    adminDecisionDueAt: undefined,
    confirmedAt: booking.confirmedAt ?? nowIso,
    notes: booking.notes
      ? `${booking.notes}\nКлієнт надав посилання на квитанцію.`
      : "Клієнт надав посилання на квитанцію.",
  };

  const winner = bookings[index];
  for (let i = 0; i < bookings.length; i += 1) {
    if (i === index) continue;
    const contender = bookings[i];

    const sameSlot =
      contender.date === winner.date &&
      contender.sector === winner.sector &&
      overlaps(contender.startTime, contender.endTime, winner.startTime, winner.endTime);

    if (!sameSlot) continue;
    if (contender.status === "cancelled" || contender.status === "completed") continue;
    if (contender.paymentStatus === "paid" || contender.paymentStatus === "verification") continue;

    bookings[i] = {
      ...contender,
      status: "cancelled",
      paymentStatus: "unpaid",
      paymentDueAt: undefined,
      adminDecisionDueAt: undefined,
      confirmedAt: undefined,
      notes: contender.notes
        ? `${contender.notes}\nСкасовано: інший клієнт надіслав квитанцію раніше.`
        : "Скасовано: інший клієнт надіслав квитанцію раніше.",
    };
  }

  await saveBookings(bookings);
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/account/payments");
  revalidatePath("/admin/bookings");

  void notifyPaymentVerification({
    bookingId: winner.id,
    clientName: winner.clientName,
    clientPhone: winner.clientPhone,
    date: winner.date,
    sector: winner.sector,
    totalPrice: winner.totalPrice,
    proofUrl: normalizedReceiptUrl,
    adminBookingUrl,
  });

  return NextResponse.json({ booking: bookings[index] });
}
