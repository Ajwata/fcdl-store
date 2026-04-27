import { getBookings } from "@/lib/bookings";
import { getClientAccessRecords } from "@/lib/access-control";
import { getAllClientUsers } from "@/lib/client-auth";
import { buildClientSummaries } from "@/lib/client-summary";
import { getClientDiscounts } from "@/lib/client-discounts";

import { ClientsTable } from "@/components/admin/clients-table";

export default async function ClientsPage() {
  const [bookings, registeredUsers, discounts, clientAccess] = await Promise.all([
    getBookings(),
    getAllClientUsers(),
    getClientDiscounts(),
    getClientAccessRecords(),
  ]);
  const blockedClientKeys = new Set(
    clientAccess.filter((item) => item.isBlocked).map((item) => item.clientPhoneKey),
  );
  const clients = buildClientSummaries(bookings, registeredUsers, blockedClientKeys);
  const nonCancelledBookings = bookings.filter((b) => b.status !== "cancelled");

  const totalRevenue = nonCancelledBookings
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
          <p className="text-2xl font-bold text-slate-800">{nonCancelledBookings.length}</p>
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
