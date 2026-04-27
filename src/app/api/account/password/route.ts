import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, setOrChangeClientPassword } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`account-change-password:${payload.uid}:${ip}`, {
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

  const user = await getClientUserById(payload.uid);
  if (!user) {
    return NextResponse.json({ error: "Користувача не знайдено" }, { status: 404 });
  }

  const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  const { currentPassword, newPassword = "" } = body;

  const result = await setOrChangeClientPassword(payload.uid, newPassword, currentPassword);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
