import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { serviceUnavailable } from "@/lib/api-errors";
import {
  type PaymentSettings,
  type PaymentWindowRule,
  getPaymentSettings,
  savePaymentSettings,
} from "@/lib/payment-settings";

function normalizeRule(rule: PaymentWindowRule): PaymentWindowRule {
  return {
    minDaysBeforeStart: Math.max(0, Math.floor(rule.minDaysBeforeStart)),
    maxDaysBeforeStart:
      rule.maxDaysBeforeStart === null ? null : Math.max(0, Math.floor(rule.maxDaysBeforeStart)),
    paymentHours: Math.max(1, Math.floor(rule.paymentHours)),
  };
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Доступ заборонено" }, { status: 403 });
  }

  try {
    const settings = await getPaymentSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити правила оплати", error);
  }
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Доступ заборонено" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<PaymentSettings>;
  if (!Array.isArray(body.paymentWindowRules) || body.paymentWindowRules.length === 0) {
    return NextResponse.json({ error: "Некоректні правила оплати" }, { status: 400 });
  }

  const adminDecisionHours = Math.max(1, Math.floor(Number(body.adminDecisionHours ?? 12)));
  const paymentWindowRules = body.paymentWindowRules.map(normalizeRule);

  try {
    const saved = await savePaymentSettings({
      adminDecisionHours,
      paymentWindowRules,
    });

    return NextResponse.json({ settings: saved });
  } catch (error) {
    return serviceUnavailable("Не вдалося зберегти правила оплати", error);
  }
}
