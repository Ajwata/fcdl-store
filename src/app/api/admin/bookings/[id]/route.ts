import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { autoCompleteExpiredPaidBookings, type Booking, saveBookings } from "@/lib/bookings";
import { daysBeforeStart, getPaymentSettings, resolvePaymentWindowHours } from "@/lib/payment-settings";
import { notifyBookingCancelled, notifyPaymentReceived } from "@/lib/telegram";

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && startB < endA;
}

function appendNote(source: string, note: string): string {
  const normalized = source.trim();
  return normalized ? `${normalized}\n${note}` : note;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<Omit<Booking, "id" | "createdAt">> & {
    cancelReason?: string;
  };

  const bookings = await autoCompleteExpiredPaidBookings();
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index === -1) {
    return NextResponse.json({ error: "Бронювання не знайдено" }, { status: 404 });
  }

  const settings = await getPaymentSettings();
  const nowTs = Date.now();
  const nowIso = new Date(nowTs).toISOString();
  const current = bookings[index];

  if (body.status === "completed" && current.status !== "completed") {
    return NextResponse.json(
      { error: "Статус 'Завершено' встановлюється автоматично після завершення часу гри" },
      { status: 400 },
    );
  }

  const next: Booking = { ...current, ...body };
  const cancelReason = body.cancelReason?.trim() ?? "";

  const statusChangedToConfirmed = current.status !== "confirmed" && next.status === "confirmed";
  const paymentChangedToVerification =
    current.paymentStatus !== "verification" && next.paymentStatus === "verification";
  const paymentChangedToPaid = current.paymentStatus !== "paid" && next.paymentStatus === "paid";
  const paymentChangedToUnpaid = current.paymentStatus !== "unpaid" && next.paymentStatus === "unpaid";

  if (statusChangedToConfirmed && !next.confirmedAt) {
    next.confirmedAt = nowIso;
  }

  if (
    next.status === "confirmed" &&
    next.paymentStatus === "unpaid" &&
    (!next.paymentDueAt || statusChangedToConfirmed || paymentChangedToUnpaid)
  ) {
    const createdAtTs = new Date(next.createdAt).getTime();
    const dueBaseTs = Number.isFinite(createdAtTs) ? createdAtTs : nowTs;
    const daysBefore = daysBeforeStart(dueBaseTs, next.date, next.startTime);
    const paymentWindowHours = resolvePaymentWindowHours(settings, daysBefore);
    next.paymentDueAt = new Date(dueBaseTs + paymentWindowHours * 60 * 60 * 1000).toISOString();
  }

  if (next.status === "confirmed" && next.paymentStatus === "unpaid" && next.paymentDueAt) {
    const dueTs = new Date(next.paymentDueAt).getTime();
    if (Number.isFinite(dueTs) && dueTs <= nowTs) {
      next.status = "cancelled";
      next.paymentDueAt = undefined;
      next.adminDecisionDueAt = undefined;
      next.confirmedAt = undefined;
      next.notes = next.notes
        ? `${next.notes}\nСкасовано: сплив термін оплати після підтвердження.`
        : "Скасовано: сплив термін оплати після підтвердження.";
    }
  }

  if (paymentChangedToVerification) {
    if (next.status !== "completed") {
      next.status = "confirmed";
    }
    if (!next.confirmedAt) {
      next.confirmedAt = nowIso;
    }
    next.paymentDueAt = undefined;
    next.adminDecisionDueAt = undefined;
  }

  if (next.paymentStatus === "paid") {
    next.paymentDueAt = undefined;
    next.adminDecisionDueAt = undefined;
    if (next.status !== "completed") {
      next.status = "confirmed";
    }
    if (!next.confirmedAt) {
      next.confirmedAt = nowIso;
    }

    if (paymentChangedToPaid) {
      next.notes = appendNote(next.notes, `Підтверджено менеджером: ${session.name}.`);
    }
  }

  if (next.paymentStatus === "refunded") {
    next.status = "cancelled";
    next.paymentDueAt = undefined;
    next.adminDecisionDueAt = undefined;
    next.confirmedAt = undefined;
    next.notes = next.notes
      ? `${next.notes}\nСкасовано адміністратором із поверненням коштів.`
      : "Скасовано адміністратором із поверненням коштів.";
  }

  if (current.status !== "cancelled" && next.status === "cancelled") {
    if (!cancelReason) {
      return NextResponse.json({ error: "Вкажіть причину скасування" }, { status: 400 });
    }
    next.notes = appendNote(next.notes, `Скасовано менеджером: ${session.name}. Причина: ${cancelReason}`);
  }

  if (next.status === "cancelled" || next.status === "completed") {
    next.paymentDueAt = undefined;
    next.adminDecisionDueAt = undefined;
  }

  if (next.status !== "confirmed") {
    next.confirmedAt = undefined;
  }

  bookings[index] = next;

  if (paymentChangedToVerification || paymentChangedToPaid) {
    for (let i = 0; i < bookings.length; i += 1) {
      if (i === index) continue;
      const contender = bookings[i];
      const sameSlot =
        contender.date === next.date &&
        contender.sector === next.sector &&
        overlaps(contender.startTime, contender.endTime, next.startTime, next.endTime);
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
          ? `${contender.notes}\nСкасовано: інший клієнт раніше зафіксував бронювання квитанцією/оплатою.`
          : "Скасовано: інший клієнт раніше зафіксував бронювання квитанцією/оплатою.",
      };
    }
  }

  await saveBookings(bookings);
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/account/payments");
  revalidatePath("/admin/bookings");

  if (paymentChangedToPaid) {
    void notifyPaymentReceived({
      bookingId: next.id,
      clientName: next.clientName,
      clientPhone: next.clientPhone,
      date: next.date,
      startTime: next.startTime,
      sector: next.sector,
      totalPrice: next.totalPrice,
    });
  }

  const cancelledByAdmin = current.status !== "cancelled" && bookings[index].status === "cancelled";
  if (cancelledByAdmin) {
    void notifyBookingCancelled({
      bookingId: bookings[index].id,
      clientName: bookings[index].clientName,
      date: bookings[index].date,
      startTime: bookings[index].startTime,
      sector: bookings[index].sector,
    });
  }

  return NextResponse.json({ booking: bookings[index] });
}
