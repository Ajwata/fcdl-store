import path from "node:path";

export function resolveProjectRoot(): string {
  const cwd = process.cwd();
  const standaloneSuffix = `${path.sep}.next${path.sep}standalone`;
  if (cwd.endsWith(standaloneSuffix)) {
    return path.resolve(cwd, "..", "..");
  }
  return cwd;
}

export function getUploadsRootDirs(): string[] {
  const explicitUploadsDir = process.env.UPLOADS_DIR?.trim();
  if (explicitUploadsDir) {
    return [path.resolve(explicitUploadsDir)];
  }

  const projectRoot = resolveProjectRoot();
  const dirs = [
    path.join(projectRoot, "public", "uploads"),
    path.join(projectRoot, ".next", "standalone", "public", "uploads"),
  ];

  return Array.from(new Set(dirs));
}

export function getUploadsSubDirs(...segments: string[]): string[] {
  const sanitized = segments.filter(Boolean);
  return getUploadsRootDirs().map((dir) => path.join(dir, ...sanitized));
}
