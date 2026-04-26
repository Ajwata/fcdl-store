import type { AdminRole } from "@/lib/admin-users";
import { getManagerAccessById } from "@/lib/access-control";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const COOKIE_NAME = "admin_session";

export type AdminSessionPayload = {
  uid: string;
  login: string;
  name: string;
  role: AdminRole;
  exp: number;
};

export function getAdminAuthSecret(): string {
  const explicitSecret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_AUTH_SECRET is required in production");
  }

  return (process.env.ADMIN_PASSWORD ?? "dev-admin-auth-secret-change-me").trim();
}

async function hmacSHA256(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionToken(session: Omit<AdminSessionPayload, "exp">): Promise<string> {
  const payload: AdminSessionPayload = {
    ...session,
    exp: Date.now() + SESSION_DURATION_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const sig = await hmacSHA256(encoded, getAdminAuthSecret());
  return `${encoded}.${sig}`;
}

export async function verifySessionToken(token: string | undefined): Promise<AdminSessionPayload | null> {
  if (!token) return null;
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;
  const encoded = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);
  const expected = await hmacSHA256(encoded, getAdminAuthSecret());
  // Constant-time comparison to prevent timing attacks
  if (sig.length !== expected.length) return null;
  let equal = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) equal = false;
  }
  if (!equal) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as AdminSessionPayload;
    if (!payload?.uid || !payload?.login || !payload?.role || !payload?.exp) {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }

    if (payload.role === "manager") {
      const managerAccess = await getManagerAccessById(payload.uid);
      if (managerAccess?.isBlocked) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}
