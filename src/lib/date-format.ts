function parseDateValue(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalized = value.trim();
  if (!normalized) return null;

  const isoDateMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateUk(value: string | Date): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return typeof value === "string" ? value : "";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();

  return `${day}.${month}.${year}`;
}

export function formatDateTimeUk(value: string | Date): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return typeof value === "string" ? value : "";
  }

  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${formatDateUk(parsed)}, ${hours}:${minutes}`;
}
