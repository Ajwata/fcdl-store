import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { updateAdminPassword } from "@/lib/admin-users";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { serviceUnavailable } from "@/lib/api-errors";

export async function PATCH(request: Request) {
  const ip = getRequestIp(request);

  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

  const rateLimit = await checkRateLimit(`admin-change-password:${session.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5,
    blockMs: 30 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const { currentPassword = "", newPassword = "" } = body;

  try {
    const result = await updateAdminPassword(session.login, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serviceUnavailable("Не вдалося змінити пароль", error);
  }
}
