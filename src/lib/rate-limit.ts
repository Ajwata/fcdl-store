import { createHash } from "node:crypto";

import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

type Entry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

const store = new Map<string, Entry>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

function hashKey(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

function parseStoredEntry(value: unknown): Entry | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as { count?: unknown; windowStart?: unknown; blockedUntil?: unknown };
  const count = Number(obj.count);
  const windowStart = Number(obj.windowStart);
  const blockedUntil = Number(obj.blockedUntil);
  if (!Number.isFinite(count) || !Number.isFinite(windowStart) || !Number.isFinite(blockedUntil)) {
    return null;
  }
  return { count, windowStart, blockedUntil };
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
}

export async function checkRateLimit(
  key: string,
  options?: { windowMs?: number; maxAttempts?: number; blockMs?: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const maxAttempts = options?.maxAttempts ?? 10;
  const blockMs = options?.blockMs ?? 15 * 60 * 1000;

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const dbKey = `ratelimit:${key}`;
    const lockName = `rl_${hashKey(key).slice(0, 40)}`;

    const lockRows = await prisma.$queryRaw<Array<{ acquired: number | null }>>`
      SELECT GET_LOCK(${lockName}, 5) AS acquired
    `;
    const acquired = lockRows[0]?.acquired === 1;
    if (!acquired) {
      return { ok: false, retryAfterSeconds: 5 };
    }

    try {
      const existing = await prisma.appConfig.findUnique({ where: { key: dbKey } });
      const current = parseStoredEntry(existing?.value) ?? { count: 0, windowStart: now, blockedUntil: 0 };

      if (current.blockedUntil > now) {
        return {
          ok: false,
          retryAfterSeconds: Math.ceil((current.blockedUntil - now) / 1000),
        };
      }

      const inSameWindow = now - current.windowStart <= windowMs;
      const count = inSameWindow ? current.count + 1 : 1;
      const windowStart = inSameWindow ? current.windowStart : now;

      let next: Entry;
      if (count > maxAttempts) {
        next = { count, windowStart, blockedUntil: now + blockMs };
      } else {
        next = { count, windowStart, blockedUntil: 0 };
      }

      await prisma.appConfig.upsert({
        where: { key: dbKey },
        create: {
          key: dbKey,
          value: next,
          updatedAt: new Date(now),
        },
        update: {
          value: next,
          updatedAt: new Date(now),
        },
      });

      if (count > maxAttempts) {
        return {
          ok: false,
          retryAfterSeconds: Math.ceil(blockMs / 1000),
        };
      }

      return { ok: true, retryAfterSeconds: 0 };
    } finally {
      await prisma.$queryRaw<Array<{ released: number | null }>>`
        SELECT RELEASE_LOCK(${lockName}) AS released
      `;
    }
  }

  const current = store.get(key);
  if (!current) {
    store.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (current.blockedUntil > now) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((current.blockedUntil - now) / 1000),
    };
  }

  const inSameWindow = now - current.windowStart <= windowMs;
  const count = inSameWindow ? current.count + 1 : 1;
  const windowStart = inSameWindow ? current.windowStart : now;

  if (count > maxAttempts) {
    const blockedUntil = now + blockMs;
    store.set(key, { count, windowStart, blockedUntil });
    return {
      ok: false,
      retryAfterSeconds: Math.ceil(blockMs / 1000),
    };
  }

  store.set(key, { count, windowStart, blockedUntil: 0 });
  return { ok: true, retryAfterSeconds: 0 };
}
