import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById, toPublicClientUser, updateClientUser } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, createClientSessionToken, verifyClientSessionToken } from "@/lib/client-session";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";

export async function GET() {
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

  return NextResponse.json({ user: toPublicClientUser(user) });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; avatarUrl?: string };

  try {
    const user = await updateClientUser(payload.uid, {
      name: body.name,
      avatarUrl: body.avatarUrl,
    });

    if (!user) {
      return NextResponse.json({ error: "Користувач не знайдений" }, { status: 404 });
    }

    const response = NextResponse.json({ user: toPublicClientUser(user) });
    const nextToken = await createClientSessionToken(user.id, user.phone);
    response.cookies.set(CLIENT_COOKIE_NAME, nextToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
      secure: shouldUseSecureCookies(request),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося зберегти профіль";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
