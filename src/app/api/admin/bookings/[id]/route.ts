import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { type Booking, updateBooking } from "@/lib/bookings";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as Partial<Omit<Booking, "id" | "createdAt">>;

  const updated = await updateBooking(id, body);
  if (!updated) {
    return NextResponse.json({ error: "Бронювання не знайдено" }, { status: 404 });
  }
  return NextResponse.json({ booking: updated });
}
