import { randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { isAlphaSmsConfigured, createVerifyCode, checkVerifyCode } from "@/lib/alphasms";
import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

const usersFilePath = path.join(process.cwd(), "src", "data", "client-users.json");
const codesFilePath = path.join(process.cwd(), "src", "data", "client-sms-codes.json");

const SMS_CODE_TTL_MS = 5 * 60 * 1000;

export type ClientUser = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  /** scrypt hash вЂ” NEVER expose in API responses */
  passwordHash?: string;
  createdAt: string;
  lastLoginAt: string;
};

export type ClientUserPublic = Omit<ClientUser, "passwordHash"> & { hasPassword: boolean };

export function toPublicClientUser(user: ClientUser): ClientUserPublic {
  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

function hashClientPassword(password: string): string {
  const salt = randomUUID().replace(/-/g, "");
  const key = scryptSync(password, salt, 32);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

function verifyClientPasswordHash(password: string, hash: string): boolean {
  const [algo, salt, hashHex] = hash.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hashHex, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

type SmsCodeRecord = {
  phone: string;
  verifyId: string;
  expiresAt: number;
  createdAt?: number;
};

export function isValidPhone(phoneRaw: string): boolean {
  const normalized = normalizePhone(phoneRaw);
  return /^\+380\d{9}$/.test(normalized);
}


export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+38${digits}`;
  }
  return `+${digits}`;
}


async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

async function readUsers(): Promise<ClientUser[]> {
  return readJsonFile<ClientUser[]>(usersFilePath, []);
}

async function saveUsers(users: ClientUser[]): Promise<void> {
  await writeJsonFile(usersFilePath, users);
}

async function readCodes(): Promise<SmsCodeRecord[]> {
  return readJsonFile<SmsCodeRecord[]>(codesFilePath, []);
}

async function saveCodes(codes: SmsCodeRecord[]): Promise<void> {
  await writeJsonFile(codesFilePath, codes);
}

function toClientUserModel(user: {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  passwordHash: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}): ClientUser {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    passwordHash: user.passwordHash ?? undefined,
    createdAt: user.createdAt.toISOString(),
    lastLoginAt: user.lastLoginAt.toISOString(),
  };
}

export async function sendSmsCode(phoneRaw: string): Promise<{ phone: string; devCode?: string }> {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ");
  }

  console.log(`[sendSmsCode] Starting SMS code generation for ${phone}`);

  const expiresAt = Date.now() + SMS_CODE_TTL_MS;
  const useAlphaSms = isAlphaSmsConfigured();
  
  console.log(`[sendSmsCode] AlphaSMS configured: ${useAlphaSms}`);

  if (process.env.NODE_ENV === "production" && !useAlphaSms) {
    throw new Error("SMS-РїСЂРѕРІР°Р№РґРµСЂ РЅРµ РЅР°Р»Р°С€С‚РѕРІР°РЅРёР№");
  }

  let verifyId = "";
  let devCode = "";

  if (useAlphaSms) {
    try {
      console.log(`[sendSmsCode] Calling AlphaSMS verify/create...`);
      verifyId = await createVerifyCode(phone);
      console.log(`[sendSmsCode] AlphaSMS verify/create succeeded: ${verifyId}`);
    } catch (error) {
      console.error(`[sendSmsCode] AlphaSMS verify/create error:`, error);
      if (process.env.NODE_ENV !== "production") {
        // In dev mode, generate fake code for testing
        devCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
        verifyId = `dev-${Date.now()}`;
        console.log(`[sendSmsCode] Dev fallback activated, devCode: ${devCode}`);
      } else {
        throw error;
      }
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Dev mode without AlphaSMS
    devCode = String(randomInt(0, 1_000_000)).padStart(6, "0");
    verifyId = `dev-${Date.now()}`;
    console.log(`[sendSmsCode] Dev mode (no AlphaSMS), devCode: ${devCode}`);
  }

  // Persist the verify request
  if (isDatabaseEnabled()) {
    await getPrismaClient().clientSmsCode.deleteMany({
      where: {
        OR: [{ phone }, { expiresAt: { lte: new Date() } }],
      },
    });
    await getPrismaClient().clientSmsCode.create({
      data: {
        phone,
        verifyId,
        expiresAt: new Date(expiresAt),
      },
    });
  } else {
    const existing = await readCodes();
    const filtered = existing.filter((item) => item.phone !== phone && item.expiresAt > Date.now());
    filtered.push({ phone, verifyId, expiresAt, createdAt: Date.now() });
    await saveCodes(filtered);
  }

  console.log(`[sendSmsCode] Completed. verify_id: ${verifyId}, has_devCode: ${Boolean(devCode)}`);
  return { phone, ...(devCode ? { devCode } : {}) };
}

export async function verifySmsCode(phoneRaw: string, codeRaw: string): Promise<boolean> {
  const phone = normalizePhone(phoneRaw);
  const code = codeRaw.trim();
  
  console.log(`[verifySmsCode] Verifying code for ${phone}`);

  if (!phone || !/^\d{6}$/.test(code)) {
    console.log(`[verifySmsCode] Invalid phone or code format`);
    return false;
  }

  let record: { phone: string; verifyId: string; expiresAt: number } | null = null;
  if (isDatabaseEnabled()) {
    const dbRecord = await getPrismaClient().clientSmsCode.findUnique({ where: { phone } });
    if (dbRecord) {
      record = {
        phone: dbRecord.phone,
        verifyId: dbRecord.verifyId,
        expiresAt: dbRecord.expiresAt.getTime(),
      };
    }
  } else {
    const codes = await readCodes();
    const local = codes.find((item) => item.phone === phone && item.expiresAt > Date.now());
    if (local) {
      record = local;
    }
  }

  if (record && record.expiresAt <= Date.now()) {
    if (isDatabaseEnabled()) {
      await getPrismaClient().clientSmsCode.deleteMany({ where: { phone } });
    }
    record = null;
  }

  if (!record) {
    console.log(`[verifySmsCode] No active code record found for ${phone}`);
    return false;
  }

  const useAlphaSms = isAlphaSmsConfigured();
  console.log(`[verifySmsCode] Using AlphaSMS: ${useAlphaSms}, verify_id: ${record.verifyId}`);

  try {
    if (useAlphaSms) {
      // Check code against AlphaSMS Verify API
      console.log(`[verifySmsCode] Calling AlphaSMS verify...`);
      const valid = await checkVerifyCode(phone, code, record.verifyId);
      console.log(`[verifySmsCode] AlphaSMS verify result: ${valid}`);
      if (valid) {
        // Clean up the code record after successful verification
        if (isDatabaseEnabled()) {
          await getPrismaClient().clientSmsCode.deleteMany({ where: { phone } });
        } else {
          const codes = await readCodes();
          await saveCodes(codes.filter((item) => item.phone !== phone || item.expiresAt <= Date.now()));
        }
      }
      return valid;
    } else {
      // Dev mode: verify_id is dev-timestamp, accept any 6-digit code
      console.log(`[verifySmsCode] Dev mode verification`);
      if (/^\d{6}$/.test(code)) {
        if (isDatabaseEnabled()) {
          await getPrismaClient().clientSmsCode.deleteMany({ where: { phone } });
        } else {
          const codes = await readCodes();
          await saveCodes(codes.filter((item) => item.phone !== phone || item.expiresAt <= Date.now()));
        }
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error(`[verifySmsCode] Error during verification:`, error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    // In dev mode, any attempt means the SMS was sent, so accept any 6-digit code
    if (/^\d{6}$/.test(code)) {
      if (isDatabaseEnabled()) {
        await getPrismaClient().clientSmsCode.deleteMany({ where: { phone } });
      } else {
        const codes = await readCodes();
        await saveCodes(codes.filter((item) => item.phone !== phone || item.expiresAt <= Date.now()));
      }
      return true;
    }
    return false;
  }
}

export async function getOrCreateClientUser(phoneRaw: string, nameRaw: string): Promise<ClientUser> {
  const phone = normalizePhone(phoneRaw);
  const name = nameRaw.trim() || "РљР»С–С”РЅС‚";
  if (!isValidPhone(phone)) {
    throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ");
  }

  if (isDatabaseEnabled()) {
    const existing = await getPrismaClient().clientUser.findUnique({ where: { phone } });
    const now = new Date();
    if (existing) {
      const updated = await getPrismaClient().clientUser.update({
        where: { id: existing.id },
        data: {
          name: existing.name || name,
          lastLoginAt: now,
        },
      });
      return toClientUserModel(updated);
    }

    const created = await getPrismaClient().clientUser.create({
      data: {
        id: `client-${Date.now()}`,
        phone,
        name,
        createdAt: now,
        lastLoginAt: now,
      },
    });
    return toClientUserModel(created);
  }

  const users = await readUsers();
  const nowIso = new Date().toISOString();
  const existingIndex = users.findIndex((item) => item.phone === phone);

  if (existingIndex >= 0) {
    const existing = users[existingIndex];
    users[existingIndex] = {
      ...existing,
      name: existing.name || name,
      lastLoginAt: nowIso,
    };
    await saveUsers(users);
    return users[existingIndex];
  }

  const user: ClientUser = {
    id: `client-${Date.now()}`,
    phone,
    name,
    createdAt: nowIso,
    lastLoginAt: nowIso,
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function getClientUserByPhone(phoneRaw: string): Promise<ClientUser | null> {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    return null;
  }

  if (isDatabaseEnabled()) {
    const user = await getPrismaClient().clientUser.findUnique({ where: { phone } });
    return user ? toClientUserModel(user) : null;
  }

  const users = await readUsers();
  return users.find((item) => normalizePhone(item.phone) === phone) ?? null;
}

export async function createClientUser(
  phoneRaw: string,
  nameRaw: string,
  options?: { email?: string; password?: string },
): Promise<ClientUser> {
  const phone = normalizePhone(phoneRaw);
  const name = nameRaw.trim() || "РљР»С–С”РЅС‚";
  const email = options?.email?.trim().toLowerCase();
  const password = options?.password?.trim();
  if (!isValidPhone(phone)) {
    throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ email");
  }
  if (password && password.length < 8) {
    throw new Error("РџР°СЂРѕР»СЊ РїРѕРІРёРЅРµРЅ РјС–СЃС‚РёС‚Рё С‰РѕРЅР°Р№РјРµРЅС€Рµ 8 СЃРёРјРІРѕР»С–РІ");
  }

  if (isDatabaseEnabled()) {
    const exists = await getPrismaClient().clientUser.findUnique({ where: { phone } });
    if (exists) {
      throw new Error("РђРєР°СѓРЅС‚ Р· С†РёРј РЅРѕРјРµСЂРѕРј РІР¶Рµ С–СЃРЅСѓС”");
    }

    const now = new Date();
    const created = await getPrismaClient().clientUser.create({
      data: {
        id: `client-${Date.now()}`,
        phone,
        name,
        email: email || null,
        passwordHash: password ? hashClientPassword(password) : null,
        createdAt: now,
        lastLoginAt: now,
      },
    });
    return toClientUserModel(created);
  }

  const users = await readUsers();
  const exists = users.some((item) => normalizePhone(item.phone) === phone);
  if (exists) {
    throw new Error("РђРєР°СѓРЅС‚ Р· С†РёРј РЅРѕРјРµСЂРѕРј РІР¶Рµ С–СЃРЅСѓС”");
  }

  const nowIso = new Date().toISOString();
  const user: ClientUser = {
    id: `client-${Date.now()}`,
    phone,
    name,
    email: email || undefined,
    passwordHash: password ? hashClientPassword(password) : undefined,
    createdAt: nowIso,
    lastLoginAt: nowIso,
  };
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function touchClientUserLogin(userId: string): Promise<ClientUser | null> {
  if (isDatabaseEnabled()) {
    const existing = await getPrismaClient().clientUser.findUnique({ where: { id: userId } });
    if (!existing) {
      return null;
    }
    const updated = await getPrismaClient().clientUser.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    return toClientUserModel(updated);
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index === -1) {
    return null;
  }

  users[index] = {
    ...users[index],
    lastLoginAt: new Date().toISOString(),
  };
  await saveUsers(users);
  return users[index];
}

export async function getClientUserById(userId: string): Promise<ClientUser | null> {
  if (isDatabaseEnabled()) {
    const user = await getPrismaClient().clientUser.findUnique({ where: { id: userId } });
    return user ? toClientUserModel(user) : null;
  }

  const users = await readUsers();
  return users.find((item) => item.id === userId) ?? null;
}

export async function updateClientUser(
  userId: string,
  updates: Partial<Pick<ClientUser, "name" | "email" | "phone" | "avatarUrl">>,
): Promise<ClientUser | null> {
  if (isDatabaseEnabled()) {
    const user = await getPrismaClient().clientUser.findUnique({ where: { id: userId } });
    if (!user) return null;

    const nextPhone = typeof updates.phone === "string" ? normalizePhone(updates.phone) : undefined;
    if (typeof nextPhone === "string") {
      if (!isValidPhone(nextPhone)) {
        throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ");
      }
      const duplicate = await getPrismaClient().clientUser.findUnique({ where: { phone: nextPhone } });
      if (duplicate && duplicate.id !== userId) {
        throw new Error("Р¦РµР№ РЅРѕРјРµСЂ РІР¶Рµ РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”С‚СЊСЃСЏ С–РЅС€РёРј Р°РєР°СѓРЅС‚РѕРј");
      }
    }

    const nextEmail = updates.email?.trim().toLowerCase();
    if (typeof nextEmail === "string" && nextEmail.length > 0) {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
      if (!emailValid) {
        throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ email");
      }
    }

    const updated = await getPrismaClient().clientUser.update({
      where: { id: userId },
      data: {
        name: updates.name?.trim() || user.name,
        phone: nextPhone ?? user.phone,
        email: nextEmail === "" ? null : nextEmail ?? user.email,
        avatarUrl:
          typeof updates.avatarUrl === "string" ? updates.avatarUrl.trim() || null : user.avatarUrl,
      },
    });
    return toClientUserModel(updated);
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index === -1) return null;

  const nextPhone = typeof updates.phone === "string" ? normalizePhone(updates.phone) : undefined;
  if (typeof nextPhone === "string") {
    if (!isValidPhone(nextPhone)) {
      throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅСѓ");
    }
    const duplicate = users.find((item) => item.id !== userId && normalizePhone(item.phone) === nextPhone);
    if (duplicate) {
      throw new Error("Р¦РµР№ РЅРѕРјРµСЂ РІР¶Рµ РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”С‚СЊСЃСЏ С–РЅС€РёРј Р°РєР°СѓРЅС‚РѕРј");
    }
  }

  const nextEmail = updates.email?.trim().toLowerCase();
  if (typeof nextEmail === "string" && nextEmail.length > 0) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!emailValid) {
      throw new Error("РќРµРєРѕСЂРµРєС‚РЅРёР№ email");
    }
  }

  users[index] = {
    ...users[index],
    ...updates,
    name: updates.name?.trim() || users[index].name,
    phone: nextPhone ?? users[index].phone,
    email: nextEmail === "" ? undefined : nextEmail ?? users[index].email,
    avatarUrl: typeof updates.avatarUrl === "string" ? updates.avatarUrl.trim() || undefined : users[index].avatarUrl,
  };

  await saveUsers(users);
  return users[index];
}

export async function setOrChangeClientPassword(
  userId: string,
  newPassword: string,
  currentPassword?: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedNew = newPassword.trim();
  if (trimmedNew.length < 8) {
    return { ok: false, error: "РџР°СЂРѕР»СЊ РїРѕРІРёРЅРµРЅ РјС–СЃС‚РёС‚Рё С‰РѕРЅР°Р№РјРµРЅС€Рµ 8 СЃРёРјРІРѕР»С–РІ" };
  }

  if (isDatabaseEnabled()) {
    const user = await getPrismaClient().clientUser.findUnique({ where: { id: userId } });
    if (!user) return { ok: false, error: "РљРѕСЂРёСЃС‚СѓРІР°С‡Р° РЅРµ Р·РЅР°Р№РґРµРЅРѕ" };

    if (user.passwordHash) {
      // Password already set вЂ” require current password
      if (!currentPassword?.trim()) {
        return { ok: false, error: "Р’РІРµРґС–С‚СЊ РїРѕС‚РѕС‡РЅРёР№ РїР°СЂРѕР»СЊ" };
      }
      if (!verifyClientPasswordHash(currentPassword.trim(), user.passwordHash)) {
        return { ok: false, error: "РџРѕС‚РѕС‡РЅРёР№ РїР°СЂРѕР»СЊ РЅРµРІС–СЂРЅРёР№" };
      }
    }

    await getPrismaClient().clientUser.update({
      where: { id: userId },
      data: { passwordHash: hashClientPassword(trimmedNew) },
    });
    return { ok: true };
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index === -1) return { ok: false, error: "РљРѕСЂРёСЃС‚СѓРІР°С‡Р° РЅРµ Р·РЅР°Р№РґРµРЅРѕ" };

  const user = users[index];

  if (user.passwordHash) {
    // Password already set вЂ” require current password
    if (!currentPassword?.trim()) {
      return { ok: false, error: "Р’РІРµРґС–С‚СЊ РїРѕС‚РѕС‡РЅРёР№ РїР°СЂРѕР»СЊ" };
    }
    if (!verifyClientPasswordHash(currentPassword.trim(), user.passwordHash)) {
      return { ok: false, error: "РџРѕС‚РѕС‡РЅРёР№ РїР°СЂРѕР»СЊ РЅРµРІС–СЂРЅРёР№" };
    }
  }

  users[index] = { ...user, passwordHash: hashClientPassword(trimmedNew) };
  await saveUsers(users);
  return { ok: true };
}

export async function validateClientLoginPassword(
  phoneRaw: string,
  passwordRaw: string | undefined,
): Promise<{ ok: boolean; error?: string; requiresPassword: boolean }> {
  const user = await getClientUserByPhone(phoneRaw);
  if (!user) {
    return { ok: false, error: "РђРєР°СѓРЅС‚ РЅРµ Р·РЅР°Р№РґРµРЅРѕ. РћР±РµСЂС–С‚СЊ СЂРµС”СЃС‚СЂР°С†С–СЋ.", requiresPassword: false };
  }

  if (!user.passwordHash) {
    return { ok: true, requiresPassword: false };
  }

  const password = passwordRaw?.trim() ?? "";
  if (!password) {
    return { ok: false, error: "Р’РІРµРґС–С‚СЊ РїР°СЂРѕР»СЊ", requiresPassword: true };
  }

  if (!verifyClientPasswordHash(password, user.passwordHash)) {
    return { ok: false, error: "РќРµРІС–СЂРЅРёР№ РїР°СЂРѕР»СЊ", requiresPassword: true };
  }

  return { ok: true, requiresPassword: true };
}

