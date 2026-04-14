import { getBookings } from "@/lib/bookings";
import { getAllClientUsers } from "@/lib/client-auth";
import { getClientDiscounts } from "@/lib/client-discounts";

import { ClientsTable } from "@/components/admin/clients-table";

type ClientSummary = {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  sectors: string[];
  registeredAt: string | null;
};

function buildClients(
  bookings: Awaited<ReturnType<typeof getBookings>>,
  registeredUsers: Awaited<ReturnType<typeof getAllClientUsers>>,
): ClientSummary[] {
  const map = new Map<string, ClientSummary>();

  // Seed map with all registered users first (0 bookings by default)
  for (const u of registeredUsers) {
    map.set(u.phone, {
      name: u.name,
      phone: u.phone,
      email: u.email ?? "",
      totalBookings: 0,
      totalSpent: 0,
      lastBookingDate: "",
      sectors: [],
      registeredAt: u.createdAt,
    });
  }

  // Enrich with bookings (also adds unregistered clients who booked)
  for (const b of bookings) {
    const existing = map.get(b.clientPhone);
    if (existing) {
      existing.totalBookings += 1;
      if (b.paymentStatus === "paid") existing.totalSpent += b.totalPrice;
      if (!existing.lastBookingDate || b.date > existing.lastBookingDate) existing.lastBookingDate = b.date;
      if (!existing.sectors.includes(b.sector)) existing.sectors.push(b.sector);
    } else {
      map.set(b.clientPhone, {
        name: b.clientName,
        phone: b.clientPhone,
        email: b.clientEmail,
        totalBookings: 1,
        totalSpent: b.paymentStatus === "paid" ? b.totalPrice : 0,
        lastBookingDate: b.date,
        sectors: [b.sector],
        registeredAt: null,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings);
}

export default async function ClientsPage() {
  const [bookings, registeredUsers, discounts] = await Promise.all([
    getBookings(),
    getAllClientUsers(),
    getClientDiscounts(),
  ]);
  const clients = buildClients(bookings, registeredUsers);

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.totalPrice, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Клієнти</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {clients.length} клієнтів · ₴ {totalRevenue.toLocaleString("uk-UA")} загальна виручка
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
          <p className="mt-0.5 text-sm text-slate-500">Унікальних клієнтів</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{bookings.length}</p>
          <p className="mt-0.5 text-sm text-slate-500">Всього бронювань</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">
            ₴ {clients.length > 0 ? Math.round(totalRevenue / clients.length).toLocaleString("uk-UA") : 0}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">Середній чек на клієнта</p>
        </div>
      </div>

      <ClientsTable clients={clients} initialDiscounts={discounts} />
    </div>
  );
}
