import path from "node:path";

export function resolveProjectRoot(): string {
  return process.cwd();
}

export function getUploadsRootDirs(): string[] {
  const explicitUploadsDir = process.env.UPLOADS_DIR?.trim();
  if (explicitUploadsDir) {
    return [path.resolve(explicitUploadsDir)];
  }

  const projectRoot = resolveProjectRoot();
  const dirs = [path.join(projectRoot, "public", "uploads")];

  return Array.from(new Set(dirs));
}

export function getUploadsSubDirs(...segments: string[]): string[] {
  const sanitized = segments.filter(Boolean);
  return getUploadsRootDirs().map((dir) => path.join(dir, ...sanitized));
}
