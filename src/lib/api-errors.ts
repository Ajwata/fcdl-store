import { NextResponse } from "next/server";

export function serviceUnavailable(errorMessage: string, error: unknown) {
  return NextResponse.json(
    {
      error: errorMessage,
      details: process.env.NODE_ENV === "production" ? undefined : (error instanceof Error ? error.message : String(error)),
    },
    { status: 503 },
  );
}
