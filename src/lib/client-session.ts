import { isClientBlocked } from "@/lib/access-control";

export const CLIENT_COOKIE_NAME = "client_session";

const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type ClientSessionPayload = {
  uid: string;
  phone: string;
  exp: number;
};

function getClientAuthSecret(): string {
  const explicitSecret = process.env.CLIENT_AUTH_SECRET?.trim();
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CLIENT_AUTH_SECRET is required in production");
  }

  return (process.env.ADMIN_PASSWORD ?? "dev-client-auth-secret-change-me").trim();
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

export async function createClientSessionToken(uid: string, phone: string): Promise<string> {
  const payload: ClientSessionPayload = {
    uid,
    phone,
    exp: Date.now() + CLIENT_SESSION_TTL_MS,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
  const signature = await hmacSHA256(payloadBase64, getClientAuthSecret());
  return `${payloadBase64}.${signature}`;
}

export async function verifyClientSessionToken(token: string | undefined): Promise<ClientSessionPayload | null> {
  if (!token) return null;

  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const payloadBase64 = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  const expected = await hmacSHA256(payloadBase64, getClientAuthSecret());

  if (signature.length !== expected.length) return null;
  let equal = true;
  for (let i = 0; i < signature.length; i++) {
    if (signature.charCodeAt(i) !== expected.charCodeAt(i)) equal = false;
  }
  if (!equal) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8")) as ClientSessionPayload;
    if (!payload.uid || !payload.phone || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    if (await isClientBlocked(payload.phone)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
