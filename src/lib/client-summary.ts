import type { Booking } from "@/lib/bookings";
import type { ClientUser } from "@/lib/client-auth";

export type ClientSummary = {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  sectors: string[];
  registeredAt: string | null;
  isBlocked: boolean;
};

export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function buildClientSummaries(
  bookings: Booking[],
  registeredUsers: ClientUser[],
  blockedClientKeys: Set<string>,
): ClientSummary[] {
  const map = new Map<string, ClientSummary>();

  for (const user of registeredUsers) {
    const key = phoneKey(user.phone) || `user:${user.id}`;
    map.set(key, {
      name: user.name,
      phone: user.phone,
      email: user.email ?? "",
      totalBookings: 0,
      totalSpent: 0,
      lastBookingDate: "",
      sectors: [],
      registeredAt: user.createdAt,
      isBlocked: blockedClientKeys.has(phoneKey(user.phone)),
    });
  }

  for (const booking of bookings) {
    if (booking.status === "cancelled") continue;

    const key = phoneKey(booking.clientPhone) || `booking:${booking.id}`;
    const existing = map.get(key);

    if (existing) {
      existing.totalBookings += 1;
      if (booking.paymentStatus === "paid") existing.totalSpent += booking.totalPrice;
      if (!existing.lastBookingDate || booking.date > existing.lastBookingDate) existing.lastBookingDate = booking.date;
      if (!existing.sectors.includes(booking.sector)) existing.sectors.push(booking.sector);

      // Keep profile data from registration but fill missing fields from booking facts.
      if (!existing.phone && booking.clientPhone) existing.phone = booking.clientPhone;
      if (!existing.email && booking.clientEmail) existing.email = booking.clientEmail;
      if (!existing.name && booking.clientName) existing.name = booking.clientName;
      existing.isBlocked = existing.isBlocked || blockedClientKeys.has(phoneKey(booking.clientPhone));
    } else {
      map.set(key, {
        name: booking.clientName,
        phone: booking.clientPhone,
        email: booking.clientEmail,
        totalBookings: 1,
        totalSpent: booking.paymentStatus === "paid" ? booking.totalPrice : 0,
        lastBookingDate: booking.date,
        sectors: [booking.sector],
        registeredAt: null,
        isBlocked: blockedClientKeys.has(phoneKey(booking.clientPhone)),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings);
}
