import { promises as fs } from "node:fs";
import path from "node:path";

import { getPaymentSettings } from "@/lib/payment-settings";
import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "verification" | "paid" | "refunded";

export type Booking = {
  id: string;
  clientUserId?: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  sector: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  durationHours: number;
  pricePerHour: number;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: "cash" | "iban";
  paymentProofUrl?: string;
  paymentProofUploadedAt?: string;
  adminDecisionDueAt?: string;
  confirmedAt?: string;
  paymentDueAt?: string;
  createdAt: string; // ISO timestamp
  notes: string;
};

const dataPath = path.join(process.cwd(), "src", "data", "bookings.json");

function phoneKey(value: string): string {
  return value.replace(/\D/g, "");
}

function toDateOrNull(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bookingFromDb(row: {
  id: string;
  clientUserId: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  sector: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  pricePerHour: number;
  totalPrice: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentProofUrl: string | null;
  paymentProofUploadedAt: Date | null;
  adminDecisionDueAt: Date | null;
  confirmedAt: Date | null;
  paymentDueAt: Date | null;
  createdAt: Date;
  notes: string;
}): Booking {
  return {
    id: row.id,
    clientUserId: row.clientUserId ?? undefined,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    sector: row.sector,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    durationHours: row.durationHours,
    pricePerHour: row.pricePerHour,
    totalPrice: row.totalPrice,
    status: row.status as BookingStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentMethod: (row.paymentMethod as Booking["paymentMethod"]) ?? undefined,
    paymentProofUrl: row.paymentProofUrl ?? undefined,
    paymentProofUploadedAt: row.paymentProofUploadedAt?.toISOString(),
    adminDecisionDueAt: row.adminDecisionDueAt?.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString(),
    paymentDueAt: row.paymentDueAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    notes: row.notes,
  };
}

function bookingToDbInput(booking: Booking) {
  return {
    clientUserId: booking.clientUserId ?? null,
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientPhoneKey: phoneKey(booking.clientPhone),
    clientEmail: booking.clientEmail,
    sector: booking.sector,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    durationHours: booking.durationHours,
    pricePerHour: booking.pricePerHour,
    totalPrice: booking.totalPrice,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    paymentMethod: booking.paymentMethod ?? null,
    paymentProofUrl: booking.paymentProofUrl ?? null,
    paymentProofUploadedAt: toDateOrNull(booking.paymentProofUploadedAt),
    adminDecisionDueAt: toDateOrNull(booking.adminDecisionDueAt),
    confirmedAt: toDateOrNull(booking.confirmedAt),
    paymentDueAt: toDateOrNull(booking.paymentDueAt),
    createdAt: new Date(booking.createdAt),
    notes: booking.notes,
  };
}

export function isBookingOwnedByUser(booking: Booking, userId: string, phone: string): boolean {
  if (booking.clientUserId && booking.clientUserId === userId) {
    return true;
  }
  return phoneKey(booking.clientPhone) === phoneKey(phone);
}

export function filterBookingsForUser(bookings: Booking[], userId: string, phone: string): Booking[] {
  return bookings.filter((item) => isBookingOwnedByUser(item, userId, phone));
}

export async function rebindBookingsToUser(userId: string, oldPhone: string, newPhone: string): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.booking.updateMany({
      where: {
        OR: [
          { clientUserId: userId },
          { clientPhoneKey: phoneKey(oldPhone) },
        ],
      },
      data: {
        clientUserId: userId,
        clientPhone: newPhone,
        clientPhoneKey: phoneKey(newPhone),
      },
    });
    return;
  }

  const bookings = await getBookings();
  let changed = false;

  for (let index = 0; index < bookings.length; index += 1) {
    const item = bookings[index];
    if (item.clientUserId === userId || (!item.clientUserId && phoneKey(item.clientPhone) === phoneKey(oldPhone))) {
      bookings[index] = {
        ...item,
        clientUserId: userId,
        clientPhone: newPhone,
      };
      changed = true;
    }
  }

  if (changed) {
    await saveBookings(bookings);
  }
}

export async function getBookings(): Promise<Booking[]> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const rows = await prisma.booking.findMany({ orderBy: [{ createdAt: "asc" }] });
    return rows.map(bookingFromDb);
  }

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
}

export async function getNextBookingNumber(): Promise<number> {
  const start = await reserveBookingNumbers(1);
  return start;
}

export async function reserveBookingNumbers(count: number): Promise<number> {
  const safeCount = Number.isInteger(count) && count > 0 ? count : 1;

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const lockName = "booking_counter_lock";
    const counterKey = "booking_counter";

    const lockRows = await prisma.$queryRaw<Array<{ acquired: number | null }>>`
      SELECT GET_LOCK(${lockName}, 10) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === 1;
    if (!acquired) {
      throw new Error("Не вдалося отримати блокування лічильника бронювань");
    }

    try {
      const existing = await prisma.appConfig.findUnique({ where: { key: counterKey } });
      let nextNumber = 1;

      if (existing?.value && typeof existing.value === "object") {
        const value = existing.value as { next?: unknown };
        const parsed = Number(value.next);
        if (Number.isFinite(parsed) && parsed >= 1) {
          nextNumber = Math.floor(parsed);
        }
      }

      if (!existing) {
        const maxRows = await prisma.$queryRaw<Array<{ maxId: number | null }>>`
          SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM Booking
        `;
        const maxId = Number(maxRows[0]?.maxId ?? 0);
        if (Number.isFinite(maxId) && maxId >= 1) {
          nextNumber = Math.max(nextNumber, Math.floor(maxId) + 1);
        }
      }

      const startNumber = nextNumber;
      const updatedNext = startNumber + safeCount;

      await prisma.appConfig.upsert({
        where: { key: counterKey },
        create: {
          key: counterKey,
          value: { next: updatedNext },
          updatedAt: new Date(),
        },
        update: {
          value: { next: updatedNext },
          updatedAt: new Date(),
        },
      });

      return startNumber;
    } finally {
      await prisma.$queryRaw<Array<{ released: number | null }>>`
        SELECT RELEASE_LOCK(${lockName}) AS released
      `;
    }
  }

  const bookings = await getBookings();
  let max = 0;
  for (const b of bookings) {
    const num = parseInt(b.id, 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return max + 1;
}

function toBookingEndTimestamp(booking: Booking): number {
  return new Date(`${booking.date}T${booking.endTime}:00`).getTime();
}

function toBookingStartTimestamp(booking: Booking): number {
  return new Date(`${booking.date}T${booking.startTime}:00`).getTime();
}

function hasOverlap(a: Booking, b: Booking): boolean {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Auto-complete matches that already ended and are paid.
 * Returns current list (updated and persisted if any status changed).
 */
export async function autoCompleteExpiredPaidBookings(): Promise<Booking[]> {
  const bookings = await getBookings();
  const paymentSettings = await getPaymentSettings();
  const now = Date.now();
  let changed = false;

  let next = bookings.map((booking) => {
    const canAutoComplete =
      (booking.status === "pending" || booking.status === "confirmed") &&
      booking.paymentStatus === "paid" &&
      toBookingEndTimestamp(booking) <= now;

    if (!canAutoComplete) return booking;

    changed = true;
    return {
      ...booking,
      status: "completed" as const,
      adminDecisionDueAt: undefined,
      paymentDueAt: undefined,
      notes: booking.notes
        ? `${booking.notes}\nАвтозавершено після закінчення часу гри.`
        : "Автозавершено після закінчення часу гри.",
    };
  });

  // Auto-cancel expired pending/confirmed-unpaid bookings by configured deadlines.
  next = next.map((booking) => {
    if (booking.status === "cancelled" || booking.status === "completed" || booking.paymentStatus === "paid" || booking.paymentStatus === "verification") {
      return booking;
    }

    if (booking.status === "pending") {
      const dueTs = booking.adminDecisionDueAt
        ? new Date(booking.adminDecisionDueAt).getTime()
        : new Date(booking.createdAt).getTime() + paymentSettings.adminDecisionHours * 60 * 60 * 1000;

      if (Number.isFinite(dueTs) && now > dueTs) {
        changed = true;
        return {
          ...booking,
          status: "cancelled" as const,
          adminDecisionDueAt: undefined,
          paymentDueAt: undefined,
          notes: booking.notes
            ? `${booking.notes}\nСкасовано автоматично: адміністратор не підтвердив вчасно.`
            : "Скасовано автоматично: адміністратор не підтвердив вчасно.",
        };
      }
    }

    if (booking.status === "confirmed" && booking.paymentStatus === "unpaid") {
      const dueTs = booking.paymentDueAt ? new Date(booking.paymentDueAt).getTime() : NaN;
      if (Number.isFinite(dueTs) && now > dueTs) {
        changed = true;
        return {
          ...booking,
          status: "cancelled" as const,
          paymentDueAt: undefined,
          notes: booking.notes
            ? `${booking.notes}\nСкасовано автоматично: сплив термін оплати.`
            : "Скасовано автоматично: сплив термін оплати.",
        };
      }
    }

    return booking;
  });

  // If any booking is paid, all competing unpaid requests for same slot are cancelled.
  for (let i = 0; i < next.length; i += 1) {
    const winner = next[i];
    if (winner.status === "cancelled" || winner.paymentStatus !== "paid") continue;

    for (let j = 0; j < next.length; j += 1) {
      if (i === j) continue;
      const contender = next[j];
      const sameSlot =
        contender.status !== "cancelled" &&
        contender.paymentStatus !== "paid" &&
        contender.paymentStatus !== "verification" &&
        contender.date === winner.date &&
        contender.sector === winner.sector &&
        hasOverlap(contender, winner);

      if (!sameSlot) continue;

      changed = true;
      next[j] = {
        ...contender,
        status: "cancelled" as const,
        adminDecisionDueAt: undefined,
        paymentDueAt: undefined,
        notes: contender.notes
          ? `${contender.notes}\nСкасовано: слот оплачено іншим клієнтом раніше.`
          : "Скасовано: слот оплачено іншим клієнтом раніше.",
      };
    }
  }

  if (changed) {
    await saveBookings(next);
  }

  return next;
}

export async function saveBookings(bookings: Booking[]): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.$transaction(
      bookings.map((booking) =>
        prisma.booking.upsert({
          where: { id: booking.id },
          create: { id: booking.id, ...bookingToDbInput(booking) },
          update: bookingToDbInput(booking),
        }),
      ),
    );
    return;
  }

  await fs.writeFile(dataPath, JSON.stringify(bookings, null, 2) + "\n", "utf-8");
}

export async function updateBooking(
  id: string,
  updates: Partial<Omit<Booking, "id" | "createdAt">>,
): Promise<Booking | null> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return null;

    const nextBooking: Booking = {
      ...bookingFromDb(existing),
      ...updates,
      id,
      createdAt: bookingFromDb(existing).createdAt,
    };

    const updated = await prisma.booking.update({
      where: { id },
      data: bookingToDbInput(nextBooking),
    });
    return bookingFromDb(updated);
  }

  const bookings = await getBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return null;
  bookings[index] = { ...bookings[index], ...updates };
  await saveBookings(bookings);
  return bookings[index];
}
