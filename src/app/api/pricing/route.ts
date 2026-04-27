import { NextResponse } from "next/server";

import { getPricing } from "@/lib/pricing";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  try {
    const pricing = await getPricing();
    return NextResponse.json(pricing);
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити тарифи", error);
  }
}
