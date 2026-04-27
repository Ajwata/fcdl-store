import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { listAdminUsers } from "@/lib/admin-users";
import { autoCompleteExpiredPaidBookings } from "@/lib/bookings";
import { buildReferralReport, getReferralAssignments } from "@/lib/referrals";
import { serviceUnavailable } from "@/lib/api-errors";

type MonthlyStat = {
  monthKey: string;
  monthSort: string;
  managerId: string;
  managerName: string;
  dealsCount: number;
  commissionTotal: number;
};

function clampNumber(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeString(value: string | null): string {
  return (value ?? "").trim();
}

function buildMonthlyStats(deals: ReturnType<typeof buildReferralReport>["deals"]): MonthlyStat[] {
  const map = new Map<string, MonthlyStat>();

  for (const deal of deals) {
    const year = /^\d{4}-\d{2}-\d{2}$/.test(deal.date) ? deal.date.slice(0, 4) : "0000";
    const month = /^\d{4}-\d{2}-\d{2}$/.test(deal.date) ? deal.date.slice(5, 7) : "00";
    const monthKey = `${month}.${year}`;
    const monthSort = `${year}-${month}`;
    const key = `${deal.managerId}|${monthSort}`;

    if (!map.has(key)) {
      map.set(key, {
        monthKey,
        monthSort,
        managerId: deal.managerId,
        managerName: deal.managerName,
        dealsCount: 0,
        commissionTotal: 0,
      });
    }

    const row = map.get(key)!;
    row.dealsCount += 1;
    row.commissionTotal += deal.commission;
  }

  return Array.from(map.values()).sort((a, b) => {
    const byMonth = b.monthSort.localeCompare(a.monthSort);
    if (byMonth !== 0) return byMonth;
    return b.commissionTotal - a.commissionTotal;
  });
}

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const { searchParams } = new URL(request.url);

  const dealsPage = clampNumber(searchParams.get("dealsPage"), 1, 1, 10_000);
  const dealsLimit = clampNumber(searchParams.get("dealsLimit"), 25, 5, 100);
  const assignmentsPage = clampNumber(searchParams.get("assignmentsPage"), 1, 1, 10_000);
  const assignmentsLimit = clampNumber(searchParams.get("assignmentsLimit"), 25, 5, 100);

  const dealsQuery = normalizeString(searchParams.get("dealsQuery")).toLowerCase();
  const dealsManager = normalizeString(searchParams.get("dealsManager"));
  const dealsSortKey = normalizeString(searchParams.get("dealsSortKey")) || "date";
  const dealsSortDir = normalizeString(searchParams.get("dealsSortDir")) === "asc" ? "asc" : "desc";

  const assignmentsQuery = normalizeString(searchParams.get("assignmentsQuery")).toLowerCase();
  const assignmentsManager = normalizeString(searchParams.get("assignmentsManager"));
  const assignmentsSortKey = normalizeString(searchParams.get("assignmentsSortKey")) || "assignedAt";
  const assignmentsSortDir = normalizeString(searchParams.get("assignmentsSortDir")) === "asc" ? "asc" : "desc";

  try {
    const [bookings, assignments, admins] = await Promise.all([
      autoCompleteExpiredPaidBookings(),
      getReferralAssignments(),
      listAdminUsers(),
    ]);

  const managers = admins.filter((item) => item.role === "manager");
  const report = buildReferralReport(bookings, assignments);

  const scopedAssignments =
    session.role === "superadmin" ? assignments : assignments.filter((item) => item.managerId === session.uid);
  const scopedDeals =
    session.role === "superadmin" ? report.deals : report.deals.filter((item) => item.managerId === session.uid);
  const scopedManagers =
    session.role === "superadmin"
      ? managers
      : [managers.find((m) => m.id === session.uid) ?? { id: session.uid, login: session.login, name: session.name, role: "manager" }];

  const scopedStats =
    session.role === "superadmin"
      ? report.managerStats
      : [
          report.managerStats.find((item) => item.managerId === session.uid) ?? {
            managerId: session.uid,
            managerLogin: session.login,
            managerName: session.name,
            referredClients: scopedAssignments.length,
            clientsWithDeals: 0,
            dealsCount: 0,
            commissionTotal: 0,
          },
        ];

  const scopedTotals =
    session.role === "superadmin"
      ? report.totals
      : {
          referredClients: scopedAssignments.length,
          clientsWithDeals: scopedStats[0]?.clientsWithDeals ?? 0,
          dealsCount: scopedStats[0]?.dealsCount ?? 0,
          commissionTotal: scopedStats[0]?.commissionTotal ?? 0,
        };

  const filteredDeals = scopedDeals.filter((item) => {
    if (dealsManager && dealsManager !== "all" && item.managerId !== dealsManager) {
      return false;
    }
    if (!dealsQuery) return true;
    return (
      item.bookingId.toLowerCase().includes(dealsQuery) ||
      item.clientName.toLowerCase().includes(dealsQuery) ||
      item.clientPhone.toLowerCase().includes(dealsQuery) ||
      item.managerName.toLowerCase().includes(dealsQuery)
    );
  });

  filteredDeals.sort((a, b) => {
    let result = 0;
    if (dealsSortKey === "bookingId") result = a.bookingId.localeCompare(b.bookingId, "uk");
    else if (dealsSortKey === "clientName") result = a.clientName.localeCompare(b.clientName, "uk");
    else if (dealsSortKey === "managerName") result = a.managerName.localeCompare(b.managerName, "uk");
    else if (dealsSortKey === "totalPrice") result = a.totalPrice - b.totalPrice;
    else if (dealsSortKey === "commission") result = a.commission - b.commission;
    else result = a.date.localeCompare(b.date);
    return dealsSortDir === "asc" ? result : -result;
  });

  const filteredAssignments = scopedAssignments.filter((item) => {
    if (assignmentsManager && assignmentsManager !== "all" && item.managerId !== assignmentsManager) {
      return false;
    }
    if (!assignmentsQuery) return true;
    return (
      item.clientPhone.toLowerCase().includes(assignmentsQuery) ||
      item.managerName.toLowerCase().includes(assignmentsQuery) ||
      item.managerLogin.toLowerCase().includes(assignmentsQuery)
    );
  });

  filteredAssignments.sort((a, b) => {
    let result = 0;
    if (assignmentsSortKey === "clientPhone") result = a.clientPhone.localeCompare(b.clientPhone, "uk");
    else if (assignmentsSortKey === "managerName") result = a.managerName.localeCompare(b.managerName, "uk");
    else result = a.assignedAt.localeCompare(b.assignedAt);
    return assignmentsSortDir === "asc" ? result : -result;
  });

  const dealsTotal = filteredDeals.length;
  const dealsPageCount = Math.max(1, Math.ceil(dealsTotal / dealsLimit));
  const normalizedDealsPage = Math.min(dealsPage, dealsPageCount);
  const dealsStart = (normalizedDealsPage - 1) * dealsLimit;

  const assignmentsTotal = filteredAssignments.length;
  const assignmentsPageCount = Math.max(1, Math.ceil(assignmentsTotal / assignmentsLimit));
  const normalizedAssignmentsPage = Math.min(assignmentsPage, assignmentsPageCount);
  const assignmentsStart = (normalizedAssignmentsPage - 1) * assignmentsLimit;

    return NextResponse.json({
      role: session.role,
      managers: scopedManagers,
      report: {
        managerStats: scopedStats,
        totals: scopedTotals,
        monthlyStats: buildMonthlyStats(scopedDeals),
      },
      tables: {
        deals: {
          items: filteredDeals.slice(dealsStart, dealsStart + dealsLimit),
          total: dealsTotal,
          page: normalizedDealsPage,
          limit: dealsLimit,
          pageCount: dealsPageCount,
        },
        assignments: {
          items: filteredAssignments.slice(assignmentsStart, assignmentsStart + assignmentsLimit),
          total: assignmentsTotal,
          page: normalizedAssignmentsPage,
          limit: assignmentsLimit,
          pageCount: assignmentsPageCount,
        },
      },
    });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити дані реферальної системи", error);
  }
}

export async function POST(request: Request) {
  void request;
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  return NextResponse.json(
    { error: "Ручна прив'язка вимкнена. Клієнт сам обирає, хто його привів." },
    { status: 403 },
  );
}
