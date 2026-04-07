import { randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type AdminRole = "superadmin" | "manager";

export type AdminUserRecord = {
  id: string;
  login: string;
  name: string;
  role: AdminRole;
  passwordHash: string;
  createdAt: string;
};

export type AdminUserPublic = Omit<AdminUserRecord, "passwordHash">;

const adminUsersFilePath = path.join(process.cwd(), "src", "data", "admin-users.json");

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function defaultSuperadminLogin(): string {
  return normalizeLogin(process.env.ADMIN_LOGIN ?? "admin");
}

function defaultSuperadminName(): string {
  return (process.env.ADMIN_NAME ?? "Головний адміністратор").trim();
}

function defaultSuperadminPassword(): string {
  return (process.env.ADMIN_PASSWORD ?? "admin12345").trim();
}

function createPasswordHash(password: string, salt?: string): string {
  const actualSalt = salt ?? randomUUID().replace(/-/g, "");
  const key = scryptSync(password, actualSalt, 32);
  return `scrypt$${actualSalt}$${key.toString("hex")}`;
}

function verifyPasswordHash(password: string, passwordHash: string): boolean {
  const [algo, salt, hashHex] = passwordHash.split("$");
  if (algo !== "scrypt" || !salt || !hashHex) {
    return false;
  }

  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hashHex, "hex");
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
}

function buildDefaultSuperadmin(): AdminUserRecord {
  const login = defaultSuperadminLogin();
  return {
    id: "admin-root",
    login,
    name: defaultSuperadminName(),
    role: "superadmin",
    passwordHash: createPasswordHash(defaultSuperadminPassword(), `root-${login}`),
    createdAt: new Date(0).toISOString(),
  };
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

function ensureSuperadmin(users: AdminUserRecord[]): AdminUserRecord[] {
  const normalized = users.map((user) => ({
    ...user,
    login: normalizeLogin(user.login),
  }));

  if (normalized.some((user) => user.role === "superadmin")) {
    return normalized;
  }

  return [buildDefaultSuperadmin(), ...normalized];
}

async function readAdminUsers(): Promise<AdminUserRecord[]> {
  const users = await readJsonFile<AdminUserRecord[]>(adminUsersFilePath, []);
  return ensureSuperadmin(users);
}

async function saveAdminUsers(users: AdminUserRecord[]): Promise<void> {
  await writeJsonFile(adminUsersFilePath, users);
}

function toPublicUser(user: AdminUserRecord): AdminUserPublic {
  const { passwordHash: _passwordHash, ...publicData } = user;
  return publicData;
}

export function isValidAdminLogin(login: string): boolean {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(login);
}

export async function listAdminUsers(): Promise<AdminUserPublic[]> {
  const users = await readAdminUsers();
  return users.map(toPublicUser);
}

export async function findAdminUserByLogin(loginRaw: string): Promise<AdminUserRecord | null> {
  const login = normalizeLogin(loginRaw);
  if (!login) return null;

  const users = await readAdminUsers();
  return users.find((user) => user.login === login) ?? null;
}

export async function verifyAdminCredentials(loginRaw: string, passwordRaw: string): Promise<AdminUserRecord | null> {
  const login = normalizeLogin(loginRaw);
  const password = passwordRaw.trim();
  if (!login || !password) return null;

  const user = await findAdminUserByLogin(login);
  if (!user) return null;

  return verifyPasswordHash(password, user.passwordHash) ? user : null;
}

export async function createManagerUser(input: {
  login: string;
  name: string;
  password: string;
}): Promise<AdminUserPublic> {
  const login = normalizeLogin(input.login);
  const name = input.name.trim() || "Менеджер";
  const password = input.password.trim();

  if (!isValidAdminLogin(login)) {
    throw new Error("Логін повинен містити 3-32 символи: латиниця, цифри, ., _, -");
  }

  if (password.length < 8) {
    throw new Error("Пароль повинен містити щонайменше 8 символів");
  }

  const users = await readAdminUsers();
  const duplicate = users.find((user) => user.login === login);
  if (duplicate) {
    throw new Error("Користувач з таким логіном вже існує");
  }

  const nextUser: AdminUserRecord = {
    id: `admin-${Date.now()}`,
    login,
    name,
    role: "manager",
    passwordHash: createPasswordHash(password),
    createdAt: new Date().toISOString(),
  };

  const nextUsers = [...users, nextUser];
  await saveAdminUsers(nextUsers);
  return toPublicUser(nextUser);
}

export async function updateAdminPassword(
  login: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmedCurrent = currentPassword.trim();
  const trimmedNew = newPassword.trim();

  if (!trimmedCurrent) return { ok: false, error: "Введіть поточний пароль" };
  if (trimmedNew.length < 8) {
    return { ok: false, error: "Новий пароль повинен містити щонайменше 8 символів" };
  }

  const users = await readAdminUsers();
  const index = users.findIndex((u) => u.login === normalizeLogin(login));
  if (index === -1) return { ok: false, error: "Користувача не знайдено" };

  if (!verifyPasswordHash(trimmedCurrent, users[index].passwordHash)) {
    return { ok: false, error: "Поточний пароль невірний" };
  }

  users[index] = { ...users[index], passwordHash: createPasswordHash(trimmedNew) };
  await saveAdminUsers(users);
  return { ok: true };
}

export async function deleteManagerUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const id = userId.trim();
  if (!id) {
    return { ok: false, error: "Некоректний ID користувача" };
  }

  const users = await readAdminUsers();
  const target = users.find((user) => user.id === id);
  if (!target) {
    return { ok: false, error: "Користувача не знайдено" };
  }

  if (target.role !== "manager") {
    return { ok: false, error: "Можна видаляти лише менеджерів" };
  }

  const nextUsers = users.filter((user) => user.id !== id);
  await saveAdminUsers(nextUsers);
  return { ok: true };
}
