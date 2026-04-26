import { promises as fs } from "node:fs";
import path from "node:path";

import { getPrismaClient, isDatabaseEnabled } from "@/lib/prisma";

export type ClientAccessRecord = {
  clientPhone: string;
  clientPhoneKey: string;
  isBlocked: boolean;
  updatedAt: string;
  updatedById?: string;
};

export type ManagerAccessRecord = {
  managerId: string;
  isBlocked: boolean;
  bonusPercent: number;
  updatedAt: string;
  updatedById?: string;
};

type ClientAccessPayload = {
  clients: ClientAccessRecord[];
};

type ManagerAccessPayload = {
  managers: ManagerAccessRecord[];
};

const clientAccessFilePath = path.join(process.cwd(), "src", "data", "client-access-control.json");
const managerAccessFilePath = path.join(process.cwd(), "src", "data", "manager-access-control.json");
const CLIENT_ACCESS_CONFIG_KEY = "client-access-control";
const MANAGER_ACCESS_CONFIG_KEY = "manager-access-control";

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
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

async function readClientAccessPayload(): Promise<ClientAccessPayload> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.appConfig.findUnique({ where: { key: CLIENT_ACCESS_CONFIG_KEY } });
    const parsed = (row?.value ?? {}) as Partial<ClientAccessPayload>;
    return { clients: Array.isArray(parsed.clients) ? parsed.clients : [] };
  }

  const parsed = await readJsonFile<Partial<ClientAccessPayload>>(clientAccessFilePath, {});
  return { clients: Array.isArray(parsed.clients) ? parsed.clients : [] };
}

async function saveClientAccessPayload(payload: ClientAccessPayload): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.appConfig.upsert({
      where: { key: CLIENT_ACCESS_CONFIG_KEY },
      create: {
        key: CLIENT_ACCESS_CONFIG_KEY,
        value: payload,
        updatedAt: new Date(),
      },
      update: {
        value: payload,
        updatedAt: new Date(),
      },
    });
    return;
  }

  await writeJsonFile(clientAccessFilePath, payload);
}

async function readManagerAccessPayload(): Promise<ManagerAccessPayload> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const row = await prisma.appConfig.findUnique({ where: { key: MANAGER_ACCESS_CONFIG_KEY } });
    const parsed = (row?.value ?? {}) as Partial<ManagerAccessPayload>;
    return { managers: Array.isArray(parsed.managers) ? parsed.managers : [] };
  }

  const parsed = await readJsonFile<Partial<ManagerAccessPayload>>(managerAccessFilePath, {});
  return { managers: Array.isArray(parsed.managers) ? parsed.managers : [] };
}

async function saveManagerAccessPayload(payload: ManagerAccessPayload): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.appConfig.upsert({
      where: { key: MANAGER_ACCESS_CONFIG_KEY },
      create: {
        key: MANAGER_ACCESS_CONFIG_KEY,
        value: payload,
        updatedAt: new Date(),
      },
      update: {
        value: payload,
        updatedAt: new Date(),
      },
    });
    return;
  }

  await writeJsonFile(managerAccessFilePath, payload);
}

export async function getClientAccessRecords(): Promise<ClientAccessRecord[]> {
  const payload = await readClientAccessPayload();
  return payload.clients
    .map((item) => ({
      clientPhone: item.clientPhone,
      clientPhoneKey: item.clientPhoneKey || phoneKey(item.clientPhone),
      isBlocked: Boolean(item.isBlocked),
      updatedAt: item.updatedAt,
      updatedById: item.updatedById,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function isClientBlocked(phone: string): Promise<boolean> {
  const key = phoneKey(phone);
  if (!key) return false;

  const records = await getClientAccessRecords();
  return records.some((item) => item.clientPhoneKey === key && item.isBlocked);
}

export async function setClientBlocked(input: {
  clientPhone: string;
  isBlocked: boolean;
  updatedById?: string;
}): Promise<ClientAccessRecord> {
  const normalizedPhone = input.clientPhone.trim();
  const key = phoneKey(normalizedPhone);
  if (!key) {
    throw new Error("Некоректний номер телефону клієнта");
  }

  const records = await getClientAccessRecords();
  const now = new Date().toISOString();

  const nextRecord: ClientAccessRecord = {
    clientPhone: normalizedPhone,
    clientPhoneKey: key,
    isBlocked: input.isBlocked,
    updatedAt: now,
    updatedById: input.updatedById,
  };

  const next = records.filter((item) => item.clientPhoneKey !== key);
  if (input.isBlocked) {
    next.push(nextRecord);
  }

  await saveClientAccessPayload({ clients: next });
  return nextRecord;
}

export async function getManagerAccessRecords(): Promise<ManagerAccessRecord[]> {
  const payload = await readManagerAccessPayload();
  return payload.managers
    .map((item) => ({
      managerId: item.managerId,
      isBlocked: Boolean(item.isBlocked),
      bonusPercent: Math.max(0, Math.min(100, Math.round(item.bonusPercent ?? 0))),
      updatedAt: item.updatedAt,
      updatedById: item.updatedById,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getManagerAccessById(managerId: string): Promise<ManagerAccessRecord | null> {
  const id = managerId.trim();
  if (!id) return null;

  const records = await getManagerAccessRecords();
  return records.find((item) => item.managerId === id) ?? null;
}

export async function upsertManagerAccess(input: {
  managerId: string;
  isBlocked?: boolean;
  bonusPercent?: number;
  updatedById?: string;
}): Promise<ManagerAccessRecord> {
  const id = input.managerId.trim();
  if (!id) {
    throw new Error("Некоректний ID менеджера");
  }

  const records = await getManagerAccessRecords();
  const existing = records.find((item) => item.managerId === id);
  const now = new Date().toISOString();

  const nextRecord: ManagerAccessRecord = {
    managerId: id,
    isBlocked: input.isBlocked ?? existing?.isBlocked ?? false,
    bonusPercent: Math.max(0, Math.min(100, Math.round(input.bonusPercent ?? existing?.bonusPercent ?? 0))),
    updatedAt: now,
    updatedById: input.updatedById,
  };

  const next = records.filter((item) => item.managerId !== id);
  next.push(nextRecord);
  await saveManagerAccessPayload({ managers: next });
  return nextRecord;
}

export async function removeManagerAccess(managerId: string): Promise<void> {
  const id = managerId.trim();
  if (!id) return;

  const records = await getManagerAccessRecords();
  const next = records.filter((item) => item.managerId !== id);
  await saveManagerAccessPayload({ managers: next });
}
