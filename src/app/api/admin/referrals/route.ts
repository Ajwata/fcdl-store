import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { listAdminUsers } from "@/lib/admin-users";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { buildReferralReport, getReferralAssignments, upsertReferralAssignment } from "@/lib/referrals";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

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
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`admin-referrals-assign:${session.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 20,
    blockMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { clientPhone?: string; managerId?: string };
  const clientPhone = body.clientPhone?.trim() ?? "";
  if (!clientPhone) {
    return NextResponse.json({ error: "Вкажіть телефон клієнта" }, { status: 400 });
  }

  const admins = await listAdminUsers();
  const managers = admins.filter((item) => item.role === "manager");

  const manager = session.role === "superadmin"
    ? managers.find((item) => item.id === body.managerId)
    : managers.find((item) => item.id === session.uid);

  if (!manager) {
    return NextResponse.json({ error: "Менеджера не знайдено" }, { status: 404 });
  }

  const assignment = await upsertReferralAssignment({
    clientPhone,
    managerId: manager.id,
    managerLogin: manager.login,
    managerName: manager.name,
    assignedById: session.uid,
  });

  return NextResponse.json({ assignment });
}
