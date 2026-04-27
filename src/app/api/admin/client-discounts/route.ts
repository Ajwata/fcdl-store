import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getClientDiscounts, upsertClientDiscount } from "@/lib/client-discounts";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  try {
    const discounts = await getClientDiscounts();
    return NextResponse.json({ discounts });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не вдалося завантажити знижки клієнтів",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`admin-client-discounts:${session.uid}:${ip}`, {
    windowMs: 10 * 60 * 1000,
    maxAttempts: 30,
    blockMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: `Забагато спроб. Спробуйте через ${rateLimit.retryAfterSeconds} с.` },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json()) as { clientPhone?: string; discountPercent?: number };

  if (!body.clientPhone?.trim()) {
    return NextResponse.json({ error: "Вкажіть телефон клієнта" }, { status: 400 });
  }

  if (typeof body.discountPercent !== "number" || Number.isNaN(body.discountPercent)) {
    return NextResponse.json({ error: "Некоректна знижка" }, { status: 400 });
  }

  try {
    const discount = await upsertClientDiscount({
      clientPhone: body.clientPhone,
      discountPercent: body.discountPercent,
      updatedById: session.uid,
    });
    return NextResponse.json({ discount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не вдалося зберегти знижку";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
