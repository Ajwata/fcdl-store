import { NextResponse } from "next/server";

import { getPricing } from "@/lib/pricing";

export async function GET() {
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
