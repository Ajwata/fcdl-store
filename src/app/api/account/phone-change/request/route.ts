import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, isValidPhone, normalizePhone, sendSmsCode } from "@/lib/client-auth";
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

  const body = (await request.json()) as { phone?: string };
  const newPhone = normalizePhone(body.phone ?? "");

  const rateLimit = checkRateLimit(`account-phone-change-request:${payload.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 3,
    blockMs: 20 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато запитів на зміну телефону. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!isValidPhone(newPhone)) {
    return NextResponse.json({ error: "Некоректний номер телефону" }, { status: 400 });
  }

  const currentUser = await getClientUserById(payload.uid);
  if (!currentUser) {
    return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
  }

  if (normalizePhone(currentUser.phone) === newPhone) {
    return NextResponse.json({ error: "Це вже ваш поточний номер" }, { status: 400 });
  }

  try {
    const result = await sendSmsCode(newPhone);
    return NextResponse.json({ phone: result.phone, devCode: result.devCode ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося відправити SMS";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
