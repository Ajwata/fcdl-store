import { NextResponse } from "next/server";

import { listAdminUsers } from "@/lib/admin-users";

export async function GET() {
  const admins = await listAdminUsers();
  const managers = admins
    .filter((item) => item.role === "manager")
    .map((item) => ({ id: item.id, name: item.name }));

  return NextResponse.json({ managers });
}
