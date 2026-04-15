import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function resolveProjectRoot(): string {
  const cwd = process.cwd();
  const standaloneSuffix = `${path.sep}.next${path.sep}standalone`;
  if (cwd.endsWith(standaloneSuffix)) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

function getReceiptDirs(projectRoot: string): string[] {
  return [
    path.join(projectRoot, "public", "uploads", "receipts"),
    path.join(projectRoot, ".next", "standalone", "public", "uploads", "receipts"),
  ];
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".pdf") return "application/pdf";
  return "image/jpeg";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const filename = path.basename(url.searchParams.get("file")?.trim() ?? "");

  if (!filename) {
    return NextResponse.json({ error: "Файл не вказано" }, { status: 400 });
  }

  const projectRoot = resolveProjectRoot();
  const receiptDirs = getReceiptDirs(projectRoot);

  for (const dir of receiptDirs) {
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
