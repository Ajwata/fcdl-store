import { NextResponse } from "next/server";

import { getPaymentSettings } from "@/lib/payment-settings";

export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Не вдалося завантажити правила оплати",
        details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
      },
      { status: 503 },
    );
  }
}
