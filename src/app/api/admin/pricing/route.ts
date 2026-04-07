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

  const pricing = await getPricing();
  return NextResponse.json(pricing);
}

export async function PATCH(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<PricingConfig>;

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

  const updated: PricingConfig = {
    eveningStartHour,
    sectors: updatedSectors,
  };

  await savePricing(updated);
  return NextResponse.json(updated);
}
