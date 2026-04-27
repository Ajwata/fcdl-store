import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { AdminRole } from "@/lib/admin-users";
import { COOKIE_NAME, type AdminSessionPayload, verifySessionToken } from "@/lib/auth";

type RequireAdminSessionOptions = {
  role?: AdminRole;
  unauthorizedMessage?: string;
  forbiddenMessage?: string;
};

type AdminSessionAuthorized = {
  ok: true;
  session: AdminSessionPayload;
};

type AdminSessionRejected = {
  ok: false;
  response: NextResponse<{ error: string }>;
};

export async function requireAdminSession(
  options?: RequireAdminSessionOptions,
): Promise<AdminSessionAuthorized | AdminSessionRejected> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options?.unauthorizedMessage ?? "Не авторизовано" },
        { status: 401 },
      ),
    };
  }

  if (options?.role && session.role !== options.role) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: options.forbiddenMessage ?? "Недостатньо прав" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, session };
}