import { NextRequest, NextResponse } from "next/server";

import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get("admin_session")?.value;
  const adminSession = await verifySessionToken(adminToken);
  const adminValid = Boolean(adminSession);

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      if (adminValid) {
        return withSecurityHeaders(NextResponse.redirect(new URL("/admin", request.url)));
      }
      return withSecurityHeaders(NextResponse.next());
    }

    if (!adminValid) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin/login", request.url)));
    }

    const isRestrictedForManager = pathname.startsWith("/admin/content") || pathname.startsWith("/admin/users");
    if (adminSession?.role === "manager" && isRestrictedForManager) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/admin", request.url)));
    }

    return withSecurityHeaders(NextResponse.next());
  }

  const clientToken = request.cookies.get(CLIENT_COOKIE_NAME)?.value;
  const clientValid = Boolean(await verifyClientSessionToken(clientToken));

  if (pathname === "/account/login") {
    if (clientValid) {
      return withSecurityHeaders(NextResponse.redirect(new URL("/account", request.url)));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (!clientValid) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/account/login", request.url)));
  }

  return withSecurityHeaders(NextResponse.next());
}
