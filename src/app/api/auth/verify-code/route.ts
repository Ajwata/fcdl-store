import { NextResponse } from "next/server";

import {
  createClientUser,
  getClientUserByPhone,
  toPublicClientUser,
  touchClientUserLogin,
  verifySmsCode,
} from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, createClientSessionToken } from "@/lib/client-session";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    phone?: string;
    code?: string;
    name?: string;
    mode?: "login" | "register";
    email?: string;
    password?: string;
    acceptedTerms?: boolean;
  };

  const mode = body.mode === "register" ? "register" : "login";
  const ip = getRequestIp(request);
  const phoneKey = body.phone?.replace(/\D/g, "") || "_";

  const rateLimit = checkRateLimit(`auth-verify-code:${ip}:${phoneKey}:${mode}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 12,
    blockMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб перевірки коду. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!body.phone || !body.code) {
    return NextResponse.json({ error: "Вкажіть номер і код" }, { status: 400 });
  }

  const valid = await verifySmsCode(body.phone, body.code);
  if (!valid) {
    return NextResponse.json({ error: "Невірний або прострочений код" }, { status: 401 });
  }

  const existingUser = await getClientUserByPhone(body.phone);

  if (mode === "login" && !existingUser) {
    return NextResponse.json({ error: "Акаунт не знайдено. Спочатку зареєструйтеся." }, { status: 404 });
  }

  if (mode === "register" && existingUser) {
    return NextResponse.json({ error: "Акаунт з цим номером вже існує. Використайте вхід." }, { status: 409 });
  }

  if (mode === "register") {
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Для реєстрації вкажіть email" }, { status: 400 });
    }
    if (!body.password?.trim() || body.password.trim().length < 8) {
      return NextResponse.json({ error: "Для реєстрації вкажіть пароль (мінімум 8 символів)" }, { status: 400 });
    }
    if (!body.acceptedTerms) {
      return NextResponse.json({ error: "Підтвердіть правила та політику" }, { status: 400 });
    }
  }

  const user = mode === "register"
    ? await createClientUser(body.phone, body.name ?? "", {
        email: body.email,
      password: body.password,
      })
    : await touchClientUserLogin(existingUser!.id);

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
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
