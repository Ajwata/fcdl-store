import { cookies } from "next/headers";

import { getBookings, isBookingOwnedByUser } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return new Response("Не авторизовано", { status: 401 });
  }

  const user = await getClientUserById(payload.uid);
  if (!user) {
    return new Response("Користувач не знайдений", { status: 404 });
  }

  const { id } = await params;
  const bookings = await getBookings();
  const booking = bookings.find((item) => item.id === id && isBookingOwnedByUser(item, payload.uid, user.phone));

  if (!booking) {
    return new Response("Бронювання не знайдено", { status: 404 });
  }

  const receipt = [
    "FCDL.STORE",
    "Квитанція клієнта",
    `Номер: ${booking.id}`,
    `Дата: ${booking.date}`,
    `Час: ${booking.startTime}-${booking.endTime}`,
    `Поле: ${booking.sector}`,
    `Статус: ${booking.status}`,
    `Оплата: ${booking.paymentStatus}`,
    `Сума: ${booking.totalPrice} грн`,
    `Створено: ${booking.createdAt}`,
    `Нотатки: ${booking.notes || "-"}`,
  ].join("\n");

  return new Response(receipt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=receipt-${booking.id}.txt`,
    },
  });
}
