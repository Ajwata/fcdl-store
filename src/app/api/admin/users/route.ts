import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { createManagerUser, deleteManagerUser, listAdminUsers, updateManagerUserAccess } from "@/lib/admin-users";
import { getReferralAssignments } from "@/lib/referrals";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const users = await listAdminUsers();
  const assignments = await getReferralAssignments();
  const referredByManagerId = new Map<string, number>();
  for (const item of assignments) {
    referredByManagerId.set(item.managerId, (referredByManagerId.get(item.managerId) ?? 0) + 1);
  }

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      referredClients: user.role === "manager" ? referredByManagerId.get(user.id) ?? 0 : 0,
    })),
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const body = (await request.json()) as { login?: string; password?: string; name?: string };

  try {
    const user = await createManagerUser({
      login: body.login ?? "",
      name: body.name ?? "",
      password: body.password ?? "",
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося створити менеджера";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string };
  const userId = body.userId ?? "";

  const result = await deleteManagerUser(userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Не вдалося видалити менеджера" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const body = (await request.json()) as {
    userId?: string;
    isBlocked?: boolean;
    bonusPercent?: number;
  };

  const result = await updateManagerUserAccess({
    userId: body.userId ?? "",
    isBlocked: typeof body.isBlocked === "boolean" ? body.isBlocked : undefined,
    bonusPercent: typeof body.bonusPercent === "number" ? body.bonusPercent : undefined,
    updatedById: session.uid,
  });

  if (!result.ok || !result.user) {
    return NextResponse.json({ error: result.error ?? "Не вдалося оновити менеджера" }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}
