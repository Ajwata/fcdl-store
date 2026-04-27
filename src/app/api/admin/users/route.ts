import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { createManagerUser, deleteManagerUser, listAdminUsers, updateManagerUserAccess } from "@/lib/admin-users";
import { getReferralAssignments } from "@/lib/referrals";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;

  try {
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
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити користувачів", error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;

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
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { userId?: string };
  const userId = body.userId ?? "";

  try {
    const result = await deleteManagerUser(userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? "Не вдалося видалити менеджера" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serviceUnavailable("Не вдалося видалити менеджера", error);
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const body = (await request.json()) as {
    userId?: string;
    isBlocked?: boolean;
    bonusPercent?: number;
  };

  try {
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
  } catch (error) {
    return serviceUnavailable("Не вдалося оновити менеджера", error);
  }
}
