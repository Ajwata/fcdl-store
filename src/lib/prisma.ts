import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export function isDatabaseEnabled(): boolean {
  return process.env.USE_DATABASE === "true" && Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrismaClient(): PrismaClient {
  if (!isDatabaseEnabled()) {
    throw new Error("Database mode is disabled. Set USE_DATABASE=true and DATABASE_URL.");
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }

  return globalForPrisma.prisma;
}
