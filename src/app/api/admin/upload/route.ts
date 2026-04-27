import { promises as fs } from "node:fs";
import path from "node:path";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getUploadsRootDirs } from "@/lib/uploads-paths";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm", "video/quicktime", "video/ogg"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov", "ogg"]);

type DetectedType = {
  ext: string;
  kind: "image" | "video";
};

function detectFileType(buffer: Buffer): DetectedType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", kind: "image" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", kind: "image" };
  }

  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString("ascii");
    if (signature === "GIF87a" || signature === "GIF89a") {
      return { ext: "gif", kind: "image" };
    }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", kind: "image" };
  }

  if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "OggS") {
    return { ext: "ogg", kind: "video" };
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { ext: "webm", kind: "video" };
  }

  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand.includes("qt")) {
      return { ext: "mov", kind: "video" };
    }
    return { ext: "mp4", kind: "video" };
  }

  return null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не знайдено" }, { status: 400 });
  }

  const isImage = IMAGE_MIME.has(file.type);
  const isVideo = VIDEO_MIME.has(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Дозволені JPEG, PNG, WebP, GIF, MP4, WebM, MOV, OGG" },
      { status: 400 },
    );
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Зображення занадто велике (максимум 10 MB)" },
      { status: 400 },
    );
  }

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: "Відео занадто велике (максимум 100 MB)" },
      { status: 400 },
    );
  }

  const requestedExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(requestedExt)) {
    return NextResponse.json({ error: "Непідтримуване розширення файлу" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json({ error: "Не вдалося перевірити тип файлу" }, { status: 400 });
  }

  if (isImage && detected.kind !== "image") {
    return NextResponse.json({ error: "Файл не відповідає формату зображення" }, { status: 400 });
  }

  if (isVideo && detected.kind !== "video") {
    return NextResponse.json({ error: "Файл не відповідає формату відео" }, { status: 400 });
  }

  const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${detected.ext}`;
  const targetDirs = getUploadsRootDirs();

  await Promise.all(
    targetDirs.map(async (uploadsDir) => {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.writeFile(path.join(uploadsDir, filename), buffer);
    }),
  );

  return NextResponse.json({ url: `/uploads/${filename}` });
}
