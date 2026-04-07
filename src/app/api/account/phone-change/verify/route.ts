import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { rebindBookingsToUser } from "@/lib/bookings";
import { isValidPhone, normalizePhone, updateClientUser, verifySmsCode } from "@/lib/client-auth";
import { migrateClientEngagementIdentity } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, createClientSessionToken, verifyClientSessionToken } from "@/lib/client-session";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const body = (await request.json()) as { phone?: string; code?: string };
  const newPhone = normalizePhone(body.phone ?? "");
  const code = (body.code ?? "").trim();

  if (!isValidPhone(newPhone)) {
    return NextResponse.json({ error: "Некоректний номер телефону" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Некоректний код підтвердження" }, { status: 400 });
  }

  const valid = await verifySmsCode(newPhone, code);
  if (!valid) {
    return NextResponse.json({ error: "Невірний або застарілий код" }, { status: 400 });
  }

  try {
    const oldPhone = payload.phone;
    const user = await updateClientUser(payload.uid, { phone: newPhone });
    if (!user) {
      return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
    }

    await Promise.all([
      rebindBookingsToUser(payload.uid, oldPhone, newPhone),
      migrateClientEngagementIdentity(payload.uid, oldPhone, newPhone),
    ]);

    const response = NextResponse.json({ user });
    const nextToken = await createClientSessionToken(user.id, user.phone);
    response.cookies.set(CLIENT_COOKIE_NAME, nextToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося змінити номер";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
