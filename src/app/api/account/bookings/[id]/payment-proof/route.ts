import { promises as fs } from "node:fs";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getBookings, isBookingOwnedByUser, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { notifyPaymentVerification } from "@/lib/telegram";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const PDF_MIME = new Set(["application/pdf"]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024; // 10 MB

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

function extensionFromFile(file: File): string {
  const extByName = file.name.split(".").pop()?.toLowerCase();
  if (extByName && /^[a-z0-9]+$/.test(extByName)) {
    return extByName;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
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

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Додайте файл квитанції" }, { status: 400 });
  }

  if (!IMAGE_MIME.has(file.type) && !PDF_MIME.has(file.type)) {
    return NextResponse.json({ error: "Дозволено JPG, PNG, WebP, GIF або PDF" }, { status: 400 });
  }

  if (file.size > MAX_RECEIPT_BYTES) {
    return NextResponse.json({ error: "Файл завеликий (максимум 10 MB)" }, { status: 400 });
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

  const ext = extensionFromFile(file);
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "receipts");
  await fs.mkdir(uploadsDir, { recursive: true });

  const filename = `receipt-${booking.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, filename), fileBuffer);

  const nowIso = new Date().toISOString();
  const receiptUrl = `/uploads/receipts/${filename}`;
  const publicOrigin = detectPublicOrigin(request);
  const receiptAbsoluteUrl = new URL(receiptUrl, publicOrigin).toString();
  const adminBookingUrl = new URL(`/admin/bookings?bookingId=${encodeURIComponent(booking.id)}`, publicOrigin).toString();

  bookings[index] = {
    ...booking,
    status: "confirmed",
    paymentStatus: "verification",
    paymentMethod: "iban",
    paymentProofUrl: receiptUrl,
    paymentProofUploadedAt: nowIso,
    paymentDueAt: undefined,
    adminDecisionDueAt: undefined,
    confirmedAt: booking.confirmedAt ?? nowIso,
    notes: booking.notes
      ? `${booking.notes}\nОплату підтверджено клієнтом, квитанцію додано.`
      : "Оплату підтверджено клієнтом, квитанцію додано.",
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
    proofUrl: receiptAbsoluteUrl,
    adminBookingUrl,
  });

  return NextResponse.json({ booking: bookings[index] });
}
