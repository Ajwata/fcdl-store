import { promises as fs } from "node:fs";
import path from "node:path";

import { getPaymentSettings } from "@/lib/payment-settings";

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
  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(raw) as Booking[];
  } catch {
    return [];
  }
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
  await fs.writeFile(dataPath, JSON.stringify(bookings, null, 2) + "\n", "utf-8");
}

export async function updateBooking(
  id: string,
  updates: Partial<Omit<Booking, "id" | "createdAt">>,
): Promise<Booking | null> {
  const bookings = await getBookings();
  const index = bookings.findIndex((b) => b.id === id);
  if (index === -1) return null;
  bookings[index] = { ...bookings[index], ...updates };
  await saveBookings(bookings);
  return bookings[index];
}
