import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isDatabaseEnabled(): boolean {
  const strictDatabaseMode = process.env.STRICT_DATABASE_MODE === "true";
  if (strictDatabaseMode) {
    // Strict mode disables JSON fallback completely.
    return true;
  }

  return process.env.USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrismaClient(): PrismaClient {
  const strictDatabaseMode = process.env.STRICT_DATABASE_MODE === "true";

  if (!process.env.DATABASE_URL?.trim()) {
    const hint = strictDatabaseMode
      ? "STRICT_DATABASE_MODE=true requires DATABASE_URL."
      : "Set USE_DATABASE=true and DATABASE_URL to enable database mode.";
    throw new Error(`DATABASE_URL is not configured. ${hint}`);
  }

  if (!isDatabaseEnabled()) {
    throw new Error("Database mode is disabled. Set USE_DATABASE=true and DATABASE_URL.");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}
