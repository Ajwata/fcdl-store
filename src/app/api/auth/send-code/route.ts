import { NextResponse } from "next/server";

import { getClientUserByPhone, sendSmsCode, validateClientLoginPassword } from "@/lib/client-auth";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = (await request.json()) as { phone?: string; mode?: "login" | "register"; password?: string };
  const mode = body.mode === "register" ? "register" : "login";
  const ip = getRequestIp(request);
  const phoneKey = body.phone?.replace(/\D/g, "") || "_";

  const rateLimit = checkRateLimit(`auth-send-code:${ip}:${phoneKey}:${mode}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 5,
    blockMs: 20 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато запитів на код. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!body.phone) {
    return NextResponse.json({ error: "Вкажіть номер телефону" }, { status: 400 });
  }

  try {
    const existingUser = await getClientUserByPhone(body.phone);
    if (mode === "login" && !existingUser) {
      return NextResponse.json({ error: "Акаунт не знайдено. Оберіть реєстрацію." }, { status: 404 });
    }
    if (mode === "register" && existingUser) {
      return NextResponse.json({ error: "Акаунт з цим номером вже існує. Оберіть вхід." }, { status: 409 });
    }

    if (mode === "login") {
      const passwordCheck = await validateClientLoginPassword(body.phone, body.password);
      if (!passwordCheck.ok) {
        return NextResponse.json({ error: passwordCheck.error ?? "Помилка авторизації" }, { status: 401 });
      }
    }

    if (mode === "register") {
      const password = body.password?.trim() ?? "";
      if (password.length < 8) {
        return NextResponse.json({ error: "Для реєстрації введіть пароль (мінімум 8 символів)" }, { status: 400 });
      }
    }

    const result = await sendSmsCode(body.phone);
    return NextResponse.json({ ok: true, phone: result.phone, devCode: result.devCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося відправити код";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
