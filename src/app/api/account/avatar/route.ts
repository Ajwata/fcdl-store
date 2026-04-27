import { promises as fs } from "node:fs";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_COOKIE_NAME, verifyClientSessionToken } from "@/lib/client-session";
import { getUploadsSubDirs } from "@/lib/uploads-paths";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filename = path.basename(url.searchParams.get("file")?.trim() ?? "");

  if (!filename) {
    return NextResponse.json({ error: "Файл не вказано" }, { status: 400 });
  }

  const avatarDirs = getUploadsSubDirs("avatars");

  for (const dir of avatarDirs) {
    const filePath = path.join(dir, filename);
    if (await pathExists(filePath)) {
      const buffer = await fs.readFile(filePath);
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": getMimeType(filename),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  }

  return NextResponse.json({ error: "Файл не знайдено" }, { status: 404 });
}

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
  const avatarDirs = getUploadsSubDirs("avatars");

  const buffer = Buffer.from(await file.arrayBuffer());

  await Promise.all(
    avatarDirs.map(async (dir) => {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), buffer);
    }),
  );

  return NextResponse.json({ url: `/api/account/avatar?file=${encodeURIComponent(filename)}` });
}
