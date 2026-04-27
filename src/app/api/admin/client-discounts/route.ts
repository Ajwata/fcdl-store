import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/api-admin-auth";
import { getClientDiscounts, upsertClientDiscount } from "@/lib/client-discounts";
import { checkRateLimit, getRequestIp } from "@/lib/rate-limit";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const discounts = await getClientDiscounts();
    return NextResponse.json({ discounts });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити знижки клієнтів", error);
  }
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;
  const { session } = auth;

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
