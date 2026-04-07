import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getUnreadClientNotificationsCount } from "@/lib/client-engagement";
import { getClientDiscountPercent } from "@/lib/client-discounts";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ authenticated: false, notificationsCount: 0, user: null });
  }

  const user = await getClientUserById(payload.uid);
  const discountPercent = await getClientDiscountPercent(user?.phone ?? payload.phone);
  const notificationsCount = await getUnreadClientNotificationsCount(payload.uid, user?.phone ?? payload.phone);
  return NextResponse.json({
    authenticated: true,
    notificationsCount,
    discountPercent,
    user: user
      ? {
          id: user.id,
          name: user.name,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
        }
      : null,
  });
}
