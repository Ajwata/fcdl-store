import { promises as fs } from "node:fs";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
  const payload = await verifyClientSessionToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не знайдено" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Дозволені JPEG, PNG, WebP, GIF" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Максимальний розмір файлу 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const safeUserId = payload.uid.replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `avatar-${safeUserId}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "avatars");

  await fs.mkdir(uploadsDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/avatars/${filename}` });
}
