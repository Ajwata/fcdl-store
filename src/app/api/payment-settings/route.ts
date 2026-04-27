import { NextResponse } from "next/server";

import { getPaymentSettings } from "@/lib/payment-settings";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  try {
    const settings = await getPaymentSettings();
    return NextResponse.json(settings);
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити правила оплати", error);
  }
}
