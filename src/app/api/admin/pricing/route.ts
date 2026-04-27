import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getPricing, savePricing } from "@/lib/pricing";
import type { PricingConfig } from "@/lib/pricing";

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  try {
    const pricing = await getPricing();
    return NextResponse.json(pricing);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не вдалося завантажити тарифи",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<PricingConfig>;

  try {
    const current = await getPricing();

  const eveningStartHour = typeof body.eveningStartHour === "number"
    ? body.eveningStartHour
    : current.eveningStartHour;

  if (eveningStartHour < 0 || eveningStartHour > 23) {
    return NextResponse.json({ error: "Невалідна година початку вечора" }, { status: 400 });
  }

  const updatedSectors = { ...current.sectors };
  if (body.sectors && typeof body.sectors === "object") {
    for (const [key, val] of Object.entries(body.sectors)) {
      if (
        typeof val.dayPrice === "number" && val.dayPrice >= 0 &&
        typeof val.eveningPrice === "number" && val.eveningPrice >= 0
      ) {
        updatedSectors[key] = {
          dayPrice: Math.round(val.dayPrice),
          eveningPrice: Math.round(val.eveningPrice),
        };
      }
    }
  }

  let durationDiscountRules = current.durationDiscountRules;
  if (body.durationDiscountRules !== undefined) {
    if (!Array.isArray(body.durationDiscountRules)) {
      return NextResponse.json({ error: "Невалідні правила знижок за тривалість" }, { status: 400 });
    }

    const parsed = body.durationDiscountRules.map((rule) => {
      const minHours = Math.round(Number(rule?.minHours));
      const rawMax = rule?.maxHours;
      const maxHours = rawMax === null || rawMax === undefined
        ? null
        : Math.round(Number(rawMax));
      const discountPercent = Math.round(Number(rule?.discountPercent));

      return { minHours, maxHours, discountPercent };
    });

    const hasInvalid = parsed.some((rule) => {
      if (!Number.isFinite(rule.minHours) || rule.minHours < 1) return true;
      if (!Number.isFinite(rule.discountPercent) || rule.discountPercent < 0 || rule.discountPercent > 100) return true;
      if (rule.maxHours !== null && (!Number.isFinite(rule.maxHours) || rule.maxHours < rule.minHours)) return true;
      return false;
    });

    if (hasInvalid) {
      return NextResponse.json({ error: "Перевірте правила знижок: години або відсоток вказані некоректно" }, { status: 400 });
    }

    durationDiscountRules = parsed
      .map((rule) => ({
        minHours: rule.minHours,
        maxHours: rule.maxHours,
        discountPercent: rule.discountPercent,
      }))
      .sort((a, b) => a.minHours - b.minHours);
  }

    const updated: PricingConfig = {
      eveningStartHour,
      sectors: updatedSectors,
      durationDiscountRules,
    };

    await savePricing(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не вдалося зберегти тарифи",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}
