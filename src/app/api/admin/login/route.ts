import { NextResponse } from "next/server";

import { COOKIE_NAME, createSessionToken } from "@/lib/auth";
import { getManagerAccessById } from "@/lib/access-control";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";
import { verifyAdminCredentials } from "@/lib/admin-users";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const body = (await request.json()) as { login?: string; password?: string };
  const login = body.login?.trim().toLowerCase() ?? "";
  const password = body.password?.trim() ?? "";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const rateLimit = checkRateLimit(`admin-login:${forwardedFor}:${login || "_"}`);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб входу. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  if (!login || !password) {
    return NextResponse.json({ error: "Вкажіть логін та пароль" }, { status: 400 });
  }

  const user = await verifyAdminCredentials(login, password);
  if (!user) {
    return NextResponse.json({ error: "Невірний логін або пароль" }, { status: 401 });
  }

  if (user.role === "manager") {
    const managerAccess = await getManagerAccessById(user.id);
    if (managerAccess?.isBlocked) {
      return NextResponse.json({ error: "Доступ заборонено. Ваш акаунт заблоковано." }, { status: 403 });
    }
  }

  const token = await createSessionToken({
    uid: user.id,
    login: user.login,
    name: user.name,
    role: user.role,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
    secure: shouldUseSecureCookies(request),
  });
  return response;
}
