import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { updateAdminPassword } from "@/lib/admin-users";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

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
    return NextResponse.json(
      {
        error: "Не вдалося змінити пароль",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}
