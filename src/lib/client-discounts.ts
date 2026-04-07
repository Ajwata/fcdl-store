import { promises as fs } from "node:fs";
import path from "node:path";

const discountsPath = path.join(process.cwd(), "src", "data", "client-discounts.json");

export type ClientDiscount = {
  clientPhone: string;
  clientPhoneKey: string;
  discountPercent: number;
  updatedAt: string;
  updatedById?: string;
};

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

export async function getClientDiscounts(): Promise<ClientDiscount[]> {
  const rows = await readJsonFile<Array<Omit<ClientDiscount, "clientPhoneKey">>>(discountsPath, []);
  return rows.map((row) => ({ ...row, clientPhoneKey: phoneKey(row.clientPhone) }));
}

export async function getClientDiscountPercent(phone: string): Promise<number> {
  const key = phoneKey(phone);
  if (!key) return 0;

  const discounts = await getClientDiscounts();
  const match = discounts.find((item) => item.clientPhoneKey === key);
  if (!match) return 0;
  return Math.max(0, Math.min(90, Math.round(match.discountPercent)));
}

export async function upsertClientDiscount(input: {
  clientPhone: string;
  discountPercent: number;
  updatedById?: string;
}): Promise<ClientDiscount> {
  const normalizedPhone = input.clientPhone.trim();
  const key = phoneKey(normalizedPhone);
  if (!key) {
    throw new Error("Некоректний номер телефону клієнта");
  }

  const discountPercent = Math.max(0, Math.min(90, Math.round(input.discountPercent)));
  const current = await getClientDiscounts();
  const now = new Date().toISOString();

  const payload: ClientDiscount = {
    clientPhone: normalizedPhone,
    clientPhoneKey: key,
    discountPercent,
    updatedAt: now,
    updatedById: input.updatedById,
  };

  const next = current.filter((item) => item.clientPhoneKey !== key);

  // discount=0 means discount removed for this client
  if (discountPercent > 0) {
    next.push(payload);
  }

  await writeJsonFile(
    discountsPath,
    next.map(({ clientPhoneKey, ...rest }) => rest),
  );

  return payload;
}

export function applyDiscount(amount: number, discountPercent: number): number {
  const safeAmount = Math.max(0, Math.round(amount));
  const safePercent = Math.max(0, Math.min(90, Math.round(discountPercent)));
  return Math.round((safeAmount * (100 - safePercent)) / 100);
}
