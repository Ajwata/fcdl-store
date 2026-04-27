import { NextResponse } from "next/server";

import {
  createClientUser,
  getClientUserByPhone,
  toPublicClientUser,
  touchClientUserLogin,
  verifySmsCode,
} from "@/lib/client-auth";
import { isClientBlocked } from "@/lib/access-control";
import { CLIENT_COOKIE_NAME, createClientSessionToken } from "@/lib/client-session";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { listAdminUsers } from "@/lib/admin-users";
import { assignReferralByClientChoice } from "@/lib/referrals";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    phone?: string;
    code?: string;
    name?: string;
    mode?: "login" | "register";
    password?: string;
    acceptedTerms?: boolean;
    referredByManagerId?: string;
  };

  const mode = body.mode === "register" ? "register" : "login";
  const ip = getRequestIp(request);
  const phoneKey = body.phone?.replace(/\D/g, "") || "_";

  const rateLimit = await checkRateLimit(`auth-verify-code:${ip}:${phoneKey}:${mode}`, {
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

  if (await isClientBlocked(body.phone)) {
    return NextResponse.json(
      { error: "Доступ заборонено. Ваш акаунт заблоковано. Зверніться до адміністратора." },
      { status: 403 },
    );
  }

  if (mode === "login" && !existingUser) {
    return NextResponse.json({ error: "Акаунт не знайдено. Спочатку зареєструйтеся." }, { status: 404 });
  }

  if (mode === "register" && existingUser) {
    return NextResponse.json({ error: "Акаунт з цим номером вже існує. Використайте вхід." }, { status: 409 });
  }

  if (mode === "register") {
    if (!body.password?.trim() || body.password.trim().length < 8) {
      return NextResponse.json({ error: "Для реєстрації вкажіть пароль (мінімум 8 символів)" }, { status: 400 });
    }
    if (!body.acceptedTerms) {
      return NextResponse.json({ error: "Підтвердіть правила та політику" }, { status: 400 });
    }
  }

  const user = mode === "register"
    ? await createClientUser(body.phone, body.name ?? "", {
      password: body.password,
      })
    : await touchClientUserLogin(existingUser!.id);

  if (!user) {
    return NextResponse.json({ error: "Не вдалося виконати вхід" }, { status: 500 });
  }

  if (mode === "register") {
    const referredByManagerId = body.referredByManagerId?.trim() ?? "";
    if (referredByManagerId) {
      const admins = await listAdminUsers();
      const manager = admins.find((item) => item.role === "manager" && item.id === referredByManagerId);
      if (!manager) {
        return NextResponse.json({ error: "Обраного менеджера не знайдено" }, { status: 400 });
      }

      await assignReferralByClientChoice({
        clientPhone: user.phone,
        managerId: manager.id,
        managerLogin: manager.login,
        managerName: manager.name,
      });
    }
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
