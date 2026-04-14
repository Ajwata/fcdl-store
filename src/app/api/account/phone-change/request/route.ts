import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, getClientUserByPhone, isValidPhone, normalizePhone, sendSmsCode } from "@/lib/client-auth";
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

  try {
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

    const duplicateUser = await getClientUserByPhone(newPhone);
    if (duplicateUser && duplicateUser.id !== payload.uid) {
      return NextResponse.json({ error: "Цей номер вже використовується іншим акаунтом" }, { status: 409 });
    }

    const result = await sendSmsCode(newPhone);
    return NextResponse.json({ phone: result.phone });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося відправити SMS";
    if (/AlphaSMS verify\/create: HTTP_\d+/i.test(message)) {
      return NextResponse.json(
        { error: "SMS-сервіс тимчасово недоступний. Спробуйте ще раз через 1-2 хвилини." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
