import { promises as fs } from "node:fs";
import path from "node:path";

export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

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

/**
 * Auto-complete matches that already ended and are paid.
 * Returns current list (updated and persisted if any status changed).
 */
export async function autoCompleteExpiredPaidBookings(): Promise<Booking[]> {
  const bookings = await getBookings();
  const now = Date.now();
  let changed = false;

  const next = bookings.map((booking) => {
    const canAutoComplete =
      (booking.status === "pending" || booking.status === "confirmed") &&
      booking.paymentStatus === "paid" &&
      toBookingEndTimestamp(booking) <= now;

    if (!canAutoComplete) return booking;

    changed = true;
    return {
      ...booking,
      status: "completed" as const,
      notes: booking.notes
        ? `${booking.notes}\nАвтозавершено після закінчення часу гри.`
        : "Автозавершено після закінчення часу гри.",
    };
  });

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
