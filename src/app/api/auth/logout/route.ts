import { NextResponse } from "next/server";

import { CLIENT_COOKIE_NAME } from "@/lib/client-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CLIENT_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return response;
}
