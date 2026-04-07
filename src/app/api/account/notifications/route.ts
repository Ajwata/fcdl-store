import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getClientUserById } from "@/lib/client-auth";
import { getClientNotifications, markClientNotificationsRead } from "@/lib/client-engagement";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

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

  await markClientNotificationsRead(payload.uid, user.phone);
  const notifications = await getClientNotifications(payload.uid, user.phone);
  return NextResponse.json({ notifications });
}
