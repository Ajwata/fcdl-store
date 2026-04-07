import { cookies } from "next/headers";

import { filterBookingsForUser, getBookings } from "@/lib/bookings";
import { getClientUserById } from "@/lib/client-auth";
import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

function toCsvRow(values: Array<string | number>): string {
  return values
    .map((value) => {
      const str = String(value ?? "");
      if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
        return `"${str.replace(/\"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

export async function GET() {
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

  const bookings = filterBookingsForUser(await getBookings(), payload.uid, user.phone).sort((a, b) =>
    `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`),
  );

  const lines = [
    toCsvRow(["ID", "Дата", "Час початку", "Час завершення", "Поле", "Статус", "Статус оплати", "Сума", "Нотатки"]),
    ...bookings.map((item) =>
      toCsvRow([
        item.id,
        item.date,
        item.startTime,
        item.endTime,
        item.sector,
        item.status,
        item.paymentStatus,
        item.totalPrice,
        item.notes,
      ]),
    ),
  ];

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=account-bookings-${new Date().toISOString().slice(0, 10)}.csv`,
    },
  });
}
