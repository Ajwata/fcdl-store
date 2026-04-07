import { randomInt, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const usersFilePath = path.join(process.cwd(), "src", "data", "client-users.json");
const codesFilePath = path.join(process.cwd(), "src", "data", "client-sms-codes.json");

const SMS_CODE_TTL_MS = 5 * 60 * 1000;

export type ClientUser = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  /** scrypt hash — NEVER expose in API responses */
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
  code: string;
  expiresAt: number;
  sentAt?: number;
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

export async function sendSmsCode(phoneRaw: string): Promise<{ phone: string; devCode?: string }> {
  const phone = normalizePhone(phoneRaw);
  if (!isValidPhone(phone)) {
    throw new Error("Некоректний номер телефону");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = Date.now() + SMS_CODE_TTL_MS;

  const existing = await readCodes();
  const filtered = existing.filter((item) => item.phone !== phone && item.expiresAt > Date.now());
  filtered.push({ phone, code, expiresAt, sentAt: Date.now() });
  await saveCodes(filtered);

  // TODO: integrate real SMS provider here.
  if (process.env.NODE_ENV !== "production") {
    return { phone, devCode: code };
  }

  return { phone };
}

export async function verifySmsCode(phoneRaw: string, codeRaw: string): Promise<boolean> {
  const phone = normalizePhone(phoneRaw);
  const code = codeRaw.trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return false;
  }

  const codes = await readCodes();
  const record = codes.find((item) => item.phone === phone && item.expiresAt > Date.now());
  if (!record) {
    return false;
  }

  const codeBuf = Buffer.from(code, "utf-8");
  const recordBuf = Buffer.from(record.code, "utf-8");
  if (codeBuf.length !== recordBuf.length) {
    return false;
  }

  const valid = timingSafeEqual(codeBuf, recordBuf);
  if (!valid) {
    return false;
  }

  await saveCodes(codes.filter((item) => item.phone !== phone || item.expiresAt <= Date.now()));
  return true;
}

export async function getOrCreateClientUser(phoneRaw: string, nameRaw: string): Promise<ClientUser> {
  const phone = normalizePhone(phoneRaw);
  const name = nameRaw.trim() || "Клієнт";
  if (!isValidPhone(phone)) {
    throw new Error("Некоректний номер телефону");
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

  const users = await readUsers();
  return users.find((item) => normalizePhone(item.phone) === phone) ?? null;
}

export async function createClientUser(
  phoneRaw: string,
  nameRaw: string,
  options?: { email?: string; password?: string },
): Promise<ClientUser> {
  const phone = normalizePhone(phoneRaw);
  const name = nameRaw.trim() || "Клієнт";
  const email = options?.email?.trim().toLowerCase();
  const password = options?.password?.trim();
  if (!isValidPhone(phone)) {
    throw new Error("Некоректний номер телефону");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Некоректний email");
  }
  if (password && password.length < 8) {
    throw new Error("Пароль повинен містити щонайменше 8 символів");
  }

  const users = await readUsers();
  const exists = users.some((item) => normalizePhone(item.phone) === phone);
  if (exists) {
    throw new Error("Акаунт з цим номером вже існує");
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
  const users = await readUsers();
  return users.find((item) => item.id === userId) ?? null;
}

export async function updateClientUser(
  userId: string,
  updates: Partial<Pick<ClientUser, "name" | "email" | "phone" | "avatarUrl">>,
): Promise<ClientUser | null> {
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index === -1) return null;

  const nextPhone = typeof updates.phone === "string" ? normalizePhone(updates.phone) : undefined;
  if (typeof nextPhone === "string") {
    if (!isValidPhone(nextPhone)) {
      throw new Error("Некоректний номер телефону");
    }
    const duplicate = users.find((item) => item.id !== userId && normalizePhone(item.phone) === nextPhone);
    if (duplicate) {
      throw new Error("Цей номер вже використовується іншим акаунтом");
    }
  }

  const nextEmail = updates.email?.trim().toLowerCase();
  if (typeof nextEmail === "string" && nextEmail.length > 0) {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail);
    if (!emailValid) {
      throw new Error("Некоректний email");
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
    return { ok: false, error: "Пароль повинен містити щонайменше 8 символів" };
  }

  const users = await readUsers();
  const index = users.findIndex((item) => item.id === userId);
  if (index === -1) return { ok: false, error: "Користувача не знайдено" };

  const user = users[index];

  if (user.passwordHash) {
    // Password already set — require current password
    if (!currentPassword?.trim()) {
      return { ok: false, error: "Введіть поточний пароль" };
    }
    if (!verifyClientPasswordHash(currentPassword.trim(), user.passwordHash)) {
      return { ok: false, error: "Поточний пароль невірний" };
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
    return { ok: false, error: "Акаунт не знайдено. Оберіть реєстрацію.", requiresPassword: false };
  }

  if (!user.passwordHash) {
    return { ok: true, requiresPassword: false };
  }

  const password = passwordRaw?.trim() ?? "";
  if (!password) {
    return { ok: false, error: "Введіть пароль", requiresPassword: true };
  }

  if (!verifyClientPasswordHash(password, user.passwordHash)) {
    return { ok: false, error: "Невірний пароль", requiresPassword: true };
  }

  return { ok: true, requiresPassword: true };
}
