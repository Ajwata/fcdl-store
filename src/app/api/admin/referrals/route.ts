import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { buildReferralReport, getReferralAssignments } from "@/lib/referrals";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const [bookings, assignments, admins] = await Promise.all([
    autoCompleteExpiredPaidBookings(),
    getReferralAssignments(),
    listAdminUsers(),
  ]);

  const managers = admins.filter((item) => item.role === "manager");
  const report = buildReferralReport(bookings, assignments);

  if (session.role === "superadmin") {
    return NextResponse.json({
      role: session.role,
      managers,
      assignments,
      report,
    });
  }

  const ownAssignments = assignments.filter((item) => item.managerId === session.uid);
  const ownDeals = report.deals.filter((item) => item.managerId === session.uid);
  const ownStats = report.managerStats.find((item) => item.managerId === session.uid) ?? {
    managerId: session.uid,
    managerLogin: session.login,
    managerName: session.name,
    referredClients: ownAssignments.length,
    clientsWithDeals: 0,
    dealsCount: 0,
    commissionTotal: 0,
  };

  return NextResponse.json({
    role: session.role,
    managers: [managers.find((m) => m.id === session.uid) ?? { id: session.uid, login: session.login, name: session.name, role: "manager" }],
    assignments: ownAssignments,
    report: {
      managerStats: [ownStats],
      deals: ownDeals,
      totals: {
        referredClients: ownAssignments.length,
        clientsWithDeals: ownStats.clientsWithDeals,
        dealsCount: ownStats.dealsCount,
        commissionTotal: ownStats.commissionTotal,
      },
    },
  });
}

export async function POST(request: Request) {
  void request;
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  return NextResponse.json(
    { error: "Ручна прив'язка вимкнена. Клієнт сам обирає, хто його привів." },
    { status: 403 },
  );
}
