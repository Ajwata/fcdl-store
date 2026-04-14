import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, sendSmsCode } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const user = await getClientUserById(payload.uid);
  if (!user) {
    return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
  }

  const rateLimit = checkRateLimit(`account-email-change-request:${payload.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 3,
    blockMs: 20 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато запитів на зміну email. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { email?: string };
  const nextEmail = (body.email ?? "").trim().toLowerCase();

  if (!nextEmail) {
    return NextResponse.json({ error: "Вкажіть email" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return NextResponse.json({ error: "Некоректний email" }, { status: 400 });
  }
  if ((user.email ?? "").toLowerCase() === nextEmail) {
    return NextResponse.json({ error: "Це вже ваш поточний email" }, { status: 400 });
  }

  try {
    const result = await sendSmsCode(user.phone);
    return NextResponse.json({ phone: result.phone });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося відправити код";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
