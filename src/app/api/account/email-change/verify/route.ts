import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, updateClientUser, verifySmsCode } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

export async function POST(request: Request) {
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

  const body = (await request.json()) as { email?: string; code?: string };
  const nextEmail = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();

  if (!nextEmail) {
    return NextResponse.json({ error: "Вкажіть email" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
    return NextResponse.json({ error: "Некоректний email" }, { status: 400 });
  }
  if ((user.email ?? "").toLowerCase() === nextEmail) {
    return NextResponse.json({ error: "Це вже ваш поточний email" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Некоректний код підтвердження" }, { status: 400 });
  }

  const valid = await verifySmsCode(user.phone, code);
  if (!valid) {
    return NextResponse.json({ error: "Невірний або застарілий код" }, { status: 400 });
  }

  try {
    const updated = await updateClientUser(payload.uid, { email: nextEmail });
    if (!updated) {
      return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
    }

    return NextResponse.json({ user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося змінити email";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
