import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { autoCompleteExpiredPaidBookings, isBookingOwnedByUser, reserveBookingNumbers, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { applyDiscount, getClientDiscountPercent } from "@/lib/client-discounts";
import { addClientNotification } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { getPaymentSettings } from "@/lib/payment-settings";
import { calcSlotPrice, getDurationDiscountPercent, getEffectiveDiscountPercent, getPricing } from "@/lib/pricing";
import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
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

  const { id } = await params;
  const bookings = await autoCompleteExpiredPaidBookings();
  const paymentSettings = await getPaymentSettings();
  const source = bookings.find((item) => item.id === id);

  if (!source) {
    return NextResponse.json({ error: "Бронювання не знайдено" }, { status: 404 });
  }

  if (!isBookingOwnedByUser(source, payload.uid, user.phone)) {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    date?: string;
    startTime?: string;
    durationHours?: number;
  };

  const nextDate = toDate(source.date);
  nextDate.setDate(nextDate.getDate() + 7);

  const targetDate = (body.date ?? toISODate(nextDate)).trim();
  const targetStartTime = (body.startTime ?? source.startTime).trim();
  const targetDurationHours = Number.isFinite(body.durationHours) ? Number(body.durationHours) : source.durationHours;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json({ error: "Некоректна дата" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(targetStartTime)) {
    return NextResponse.json({ error: "Некоректний час початку" }, { status: 400 });
  }
  if (!Number.isInteger(targetDurationHours) || targetDurationHours < 1 || targetDurationHours > 12) {
    return NextResponse.json({ error: "Некоректна тривалість" }, { status: 400 });
  }

  const endMinutes = toMinutes(targetStartTime) + targetDurationHours * 60;
  if (toMinutes(targetStartTime) < 6 * 60 || endMinutes > 22 * 60) {
    return NextResponse.json({ error: "Час має бути в межах 06:00-22:00" }, { status: 400 });
  }

  const targetEndTime = toTime(endMinutes);

  const pricing = await getPricing();
  const personalDiscountPercent = await getClientDiscountPercent(user.phone);
  const startHour = Number(targetStartTime.split(":")[0]);
  const basePrice = calcSlotPrice(pricing, source.sector, startHour, targetDurationHours);
  const durationDiscountPercent = getDurationDiscountPercent(pricing, targetDurationHours);
  const effectiveDiscountPercent = getEffectiveDiscountPercent(personalDiscountPercent, durationDiscountPercent);
  const discountedTotalPrice = applyDiscount(basePrice, effectiveDiscountPercent);
  if (discountedTotalPrice < 0) {
    return NextResponse.json({ error: "Не вдалося розрахувати вартість бронювання" }, { status: 400 });
  }

  const hasConflict = bookings.some((item) =>
    item.status !== "cancelled" &&
    (item.paymentStatus === "paid" || item.paymentStatus === "verification") &&
    item.sector === source.sector &&
    item.date === targetDate &&
    overlaps(targetStartTime, targetEndTime, item.startTime, item.endTime),
  );

  if (hasConflict) {
    return NextResponse.json({ error: "Обраний слот уже зайнятий" }, { status: 409 });
  }

  const repeated = {
    ...source,
    id: String(await reserveBookingNumbers(1)),
    clientUserId: payload.uid,
    clientPhone: user.phone,
    date: targetDate,
    startTime: targetStartTime,
    endTime: targetEndTime,
    durationHours: targetDurationHours,
    pricePerHour: Math.max(0, Math.round(discountedTotalPrice / targetDurationHours)),
    totalPrice: discountedTotalPrice,
    status: "pending" as const,
    paymentStatus: discountedTotalPrice === 0 ? ("paid" as const) : ("unpaid" as const),
    paymentMethod: source.paymentMethod ?? ("cash" as const),
    adminDecisionDueAt: new Date(Date.now() + paymentSettings.adminDecisionHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    notes: `Повтор бронювання з ${source.date}`,
  };

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    try {
      await prisma.$transaction(async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            status: { not: "cancelled" },
            paymentStatus: { in: ["paid", "verification"] },
            date: repeated.date,
            sector: repeated.sector,
            startTime: { lt: repeated.endTime },
            endTime: { gt: repeated.startTime },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new Error("Обраний слот уже зайнятий");
        }

        await tx.booking.create({
          data: {
            id: repeated.id,
            clientUserId: repeated.clientUserId ?? null,
            clientName: repeated.clientName,
            clientPhone: repeated.clientPhone,
            clientPhoneKey: repeated.clientPhone.replace(/\D/g, ""),
            clientEmail: repeated.clientEmail,
            sector: repeated.sector,
            date: repeated.date,
            startTime: repeated.startTime,
            endTime: repeated.endTime,
            durationHours: repeated.durationHours,
            pricePerHour: repeated.pricePerHour,
            totalPrice: repeated.totalPrice,
            status: repeated.status,
            paymentStatus: repeated.paymentStatus,
            paymentMethod: repeated.paymentMethod ?? null,
            paymentProofUrl: null,
            paymentProofUploadedAt: null,
            adminDecisionDueAt: repeated.adminDecisionDueAt ? new Date(repeated.adminDecisionDueAt) : null,
            confirmedAt: null,
            paymentDueAt: repeated.paymentDueAt ? new Date(repeated.paymentDueAt) : null,
            createdAt: new Date(repeated.createdAt),
            notes: repeated.notes,
          },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не вдалося повторити бронювання";
      const status = message.includes("зайнятий") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  } else {
    bookings.push(repeated);
    await saveBookings(bookings);
  }
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/account/payments");
  revalidatePath("/admin/bookings");

  await addClientNotification(
    payload.uid,
    user.phone,
    "Бронювання повторено",
    `Створено нове бронювання на ${repeated.date} ${repeated.startTime}-${repeated.endTime}.`,
    "success",
  );

  return NextResponse.json({ booking: repeated });
}
