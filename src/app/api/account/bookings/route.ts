import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { autoCompleteExpiredPaidBookings, filterBookingsForUser, getBookings, saveBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { applyDiscount, getClientDiscountPercent } from "@/lib/client-discounts";
import { addClientNotification } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { getPaymentSettings, getPaymentWindowHours } from "@/lib/payment-settings";
import { getPricing, calcSlotPrice } from "@/lib/pricing";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { listAdminUsers } from "@/lib/admin-users";
import { assignReferralByClientChoice } from "@/lib/referrals";
import { notifyNewBooking } from "@/lib/telegram";

export async function GET() {
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

  const bookings = await autoCompleteExpiredPaidBookings();
  const clientBookings = filterBookingsForUser(bookings, payload.uid, user.phone).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );

  return NextResponse.json({ bookings: clientBookings });
}

type CreateBookingItem = {
  sector: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  totalPrice: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);
  return aStart < bEnd && bStart < aEnd;
}

export async function POST(request: Request) {
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

  const rateLimit = checkRateLimit(`account-create-bookings:${payload.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 10,
    blockMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб створення бронювань. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { items?: CreateBookingItem[]; referredByManagerId?: string };
  const items = body.items ?? [];
  const referredByManagerId = body.referredByManagerId?.trim() ?? "";

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Кошик порожній" }, { status: 400 });
  }

  const bookings = await getBookings();
  const paymentSettings = await getPaymentSettings();
  const pricing = await getPricing();
  const discountPercent = await getClientDiscountPercent(user.phone);
  const preparedItems: Array<CreateBookingItem & { canonicalTotalPrice: number; canonicalPricePerHour: number }> = [];
  let selectedManager: { id: string; login: string; name: string } | null = null;

  if (referredByManagerId) {
    const admins = await listAdminUsers();
    const manager = admins.find((item) => item.role === "manager" && item.id === referredByManagerId);
    if (!manager) {
      return NextResponse.json({ error: "Обраного менеджера не знайдено" }, { status: 400 });
    }
    selectedManager = { id: manager.id, login: manager.login, name: manager.name };
  }

  // Check conflicts both with existing bookings and within submitted cart.
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item.sector || !item.date || !item.startTime || !item.endTime || !item.durationHours || !item.totalPrice) {
      return NextResponse.json({ error: "Некоректні дані бронювання" }, { status: 400 });
    }

    // Server-side canonical price calculation (with personal discount if any)
    const startHour = Number(item.startTime.split(":")[0]);
    const basePrice = calcSlotPrice(pricing, item.sector, startHour, item.durationHours);
    const expectedPrice = applyDiscount(basePrice, discountPercent);
    if (expectedPrice <= 0) {
      return NextResponse.json(
        { error: `Не вдалося визначити ціну для ${item.sector} ${item.startTime}. Оновіть сторінку.` },
        { status: 400 },
      );
    }

    preparedItems.push({
      ...item,
      canonicalTotalPrice: expectedPrice,
      canonicalPricePerHour: Math.max(1, Math.round(expectedPrice / item.durationHours)),
    });

    const conflictExisting = bookings.find((booking) =>
      booking.status !== "cancelled" &&
      (booking.paymentStatus === "paid" || booking.paymentStatus === "verification") &&
      booking.date === item.date &&
      booking.sector === item.sector &&
      overlaps(item.startTime, item.endTime, booking.startTime, booking.endTime),
    );

    if (conflictExisting) {
      return NextResponse.json(
        { error: `Слот ${item.date} ${item.startTime}-${item.endTime} на полі ${item.sector} вже зайнятий` },
        { status: 409 },
      );
    }

    for (let j = i + 1; j < items.length; j += 1) {
      const other = items[j];
      if (item.date === other.date && item.sector === other.sector && overlaps(item.startTime, item.endTime, other.startTime, other.endTime)) {
        return NextResponse.json({ error: "У кошику є перетин слотів на одному полі" }, { status: 400 });
      }
    }
  }

  const createdAt = new Date().toISOString();
  const adminDecisionDueAt = new Date(Date.now() + paymentSettings.adminDecisionHours * 60 * 60 * 1000).toISOString();
  
  // Calculate paymentDueAt for each booking based on game date
  const createdBookings = preparedItems.map((item) => {
    const paymentWindowHours = getPaymentWindowHours(item.date, paymentSettings);
    const paymentDueAt = new Date(Date.now() + paymentWindowHours * 60 * 60 * 1000).toISOString();
    
    return {
      id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientUserId: payload.uid,
      clientName: user.name,
      clientPhone: user.phone,
      clientEmail: user.email ?? "",
      sector: item.sector,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      durationHours: item.durationHours,
      pricePerHour: item.canonicalPricePerHour,
      totalPrice: item.canonicalTotalPrice,
      status: "pending" as const,
      paymentStatus: "unpaid" as const,
      paymentMethod: "cash" as const,
      paymentDueAt,
      adminDecisionDueAt,
      createdAt,
      notes: "Створено з календаря клієнтом",
    };
  });

  bookings.push(...createdBookings);
  await saveBookings(bookings);

  if (selectedManager) {
    await assignReferralByClientChoice({
      clientPhone: user.phone,
      managerId: selectedManager.id,
      managerLogin: selectedManager.login,
      managerName: selectedManager.name,
    });
  }

  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/account/bookings");
  revalidatePath("/account/payments");
  revalidatePath("/admin/bookings");

  await addClientNotification(
    payload.uid,
    user.phone,
    "Бронювання створено",
    `Створено ${createdBookings.length} бронювання(ь). Очікуйте підтвердження адміністратора.`,
    "success",
  );

  for (const booking of createdBookings) {
    void notifyNewBooking({
      bookingId: booking.id,
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      sector: booking.sector,
      totalPrice: booking.totalPrice,
    });
  }

  return NextResponse.json({
    bookings: createdBookings,
    paymentInfo: {
      adminDecisionHours: paymentSettings.adminDecisionHours,
      paymentWindowRules: paymentSettings.paymentWindowRules,
    },
  });
}
