import { NextResponse } from "next/server";

import { getPaymentSettings } from "@/lib/payment-settings";

export async function GET() {
  const settings = await getPaymentSettings();
  return NextResponse.json(settings);
}
