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

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "unknown";
}

export function checkRateLimit(
  key: string,
  options?: { windowMs?: number; maxAttempts?: number; blockMs?: number },
): RateLimitResult {
  const now = Date.now();
  const windowMs = options?.windowMs ?? 10 * 60 * 1000;
  const maxAttempts = options?.maxAttempts ?? 10;
  const blockMs = options?.blockMs ?? 15 * 60 * 1000;

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
