import { NextResponse } from "next/server";

import { getClientUserByPhone, toPublicClientUser, touchClientUserLogin, validateClientLoginPassword } from "@/lib/client-auth";
import { isClientBlocked } from "@/lib/access-control";
import { CLIENT_COOKIE_NAME, createClientSessionToken } from "@/lib/client-session";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { phone?: string; password?: string };
  const ip = getRequestIp(request);
  const phoneKey = body.phone?.replace(/\D/g, "") || "_";

  const rateLimit = await checkRateLimit(`auth-login-password:${ip}:${phoneKey}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 10,
    blockMs: 20 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб входу. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!body.phone) {
    return NextResponse.json({ error: "Вкажіть номер телефону" }, { status: 400 });
  }

  const passwordCheck = await validateClientLoginPassword(body.phone, body.password);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error ?? "Помилка авторизації" }, { status: 401 });
  }

  const existingUser = await getClientUserByPhone(body.phone);
  if (!existingUser) {
    return NextResponse.json({ error: "Акаунт не знайдено. Оберіть реєстрацію." }, { status: 404 });
  }

  if (await isClientBlocked(existingUser.phone)) {
    return NextResponse.json(
      { error: "Доступ заборонено. Ваш акаунт заблоковано. Зверніться до адміністратора." },
      { status: 403 },
    );
  }

  const user = await touchClientUserLogin(existingUser.id);
  if (!user) {
    return NextResponse.json({ error: "Не вдалося виконати вхід" }, { status: 500 });
  }

  const token = await createClientSessionToken(user.id, user.phone);
  const response = NextResponse.json({ ok: true, user: toPublicClientUser(user) });
  response.cookies.set(CLIENT_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
    secure: shouldUseSecureCookies(request),
  });

  return response;
}