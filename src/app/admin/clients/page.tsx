import { getBookings } from "@/lib/bookings";
import { getClientDiscounts } from "@/lib/client-discounts";

import { ClientDiscountsManager } from "@/components/admin/client-discounts-manager";

type ClientSummary = {
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string;
  sectors: string[];
};

function deriveClients(bookings: Awaited<ReturnType<typeof getBookings>>): ClientSummary[] {
  const map = new Map<string, ClientSummary>();

  for (const b of bookings) {
    const existing = map.get(b.clientPhone);
    if (existing) {
      existing.totalBookings += 1;
      if (b.paymentStatus === "paid") existing.totalSpent += b.totalPrice;
      if (b.date > existing.lastBookingDate) existing.lastBookingDate = b.date;
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
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalBookings - a.totalBookings);
}

export default async function ClientsPage() {
  const [bookings, discounts] = await Promise.all([getBookings(), getClientDiscounts()]);
  const clients = deriveClients(bookings);

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

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {clients.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">Немає клієнтів</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3">Клієнт</th>
                  <th className="px-4 py-3">Телефон</th>
                  <th className="px-4 py-3">Бронювань</th>
                  <th className="px-4 py-3">Витрачено</th>
                  <th className="px-4 py-3">Поля</th>
                  <th className="px-4 py-3">Останнє</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.phone}
                    className="border-b border-slate-50 transition last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ background: `hsl(${(client.name.charCodeAt(0) * 27) % 360}, 55%, 45%)` }}
                        >
                          {client.name
                            .split(" ")
                            .slice(0, 2)
                            .map((w) => w[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{client.name}</p>
                          {client.email && (
                            <p className="text-xs text-slate-400">{client.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{client.phone}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800">{client.totalBookings}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-emerald-600">
                        ₴ {client.totalSpent.toLocaleString("uk-UA")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {client.sectors.sort().map((s) => (
                          <span
                            key={s}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{client.lastBookingDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClientDiscountsManager clients={clients} initialDiscounts={discounts} />
    </div>
  );
}
