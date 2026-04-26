import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { setClientBlocked } from "@/lib/access-control";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`admin-client-access:${session.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 60,
    blockMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { clientPhone?: string; isBlocked?: boolean };

  if (!body.clientPhone?.trim()) {
    return NextResponse.json({ error: "Вкажіть телефон клієнта" }, { status: 400 });
  }
  if (typeof body.isBlocked !== "boolean") {
    return NextResponse.json({ error: "Некоректний статус блокування" }, { status: 400 });
  }

  try {
    const record = await setClientBlocked({
      clientPhone: body.clientPhone,
      isBlocked: body.isBlocked,
      updatedById: session.uid,
    });
    return NextResponse.json({ access: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося змінити доступ клієнта";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
