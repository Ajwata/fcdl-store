import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const staticSourceDir = path.join(root, ".next", "static");
const staticTargetDir = path.join(standaloneNextDir, "static");
const publicSourceDir = path.join(root, "public");
const publicTargetDir = path.join(standaloneDir, "public");

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function copyIfExists(sourceDir, targetDir) {
  if (!(await pathExists(sourceDir))) {
    return;
  }

  await mkdir(path.dirname(targetDir), { recursive: true });
  await cp(sourceDir, targetDir, { recursive: true, force: true });
}

await mkdir(standaloneNextDir, { recursive: true });
await copyIfExists(staticSourceDir, staticTargetDir);
await copyIfExists(publicSourceDir, publicTargetDir);

console.log("Prepared standalone assets");