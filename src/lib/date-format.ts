const UK_MONTH_INDEX: Record<string, number> = {
  "січ": 0,
  "січень": 0,
  "січня": 0,
  "лют": 1,
  "лютий": 1,
  "лютого": 1,
  "бер": 2,
  "березень": 2,
  "березня": 2,
  "кві": 3,
  "квітень": 3,
  "квітня": 3,
  "тра": 4,
  "травень": 4,
  "травня": 4,
  "чер": 5,
  "червень": 5,
  "червня": 5,
  "лип": 6,
  "липень": 6,
  "липня": 6,
  "сер": 7,
  "серпень": 7,
  "серпня": 7,
  "вер": 8,
  "вересень": 8,
  "вересня": 8,
  "жов": 9,
  "жовтень": 9,
  "жовтня": 9,
  "лис": 10,
  "листопад": 10,
  "листопада": 10,
  "гру": 11,
  "грудень": 11,
  "грудня": 11,
};

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

  const dottedDateMatch = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dottedDateMatch) {
    const [, day, month, year] = dottedDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const normalizedLower = normalized.toLowerCase().replace(/,/g, "");
  const ukDateMatch = normalizedLower.match(/^(\d{1,2})\s+([\p{L}.']+)(?:\s+(\d{4}))?$/u);
  if (ukDateMatch) {
    const [, day, rawMonth, rawYear] = ukDateMatch;
    const monthKey = rawMonth.replace(/\.$/, "");
    const monthIndex = UK_MONTH_INDEX[monthKey];
    if (monthIndex !== undefined) {
      const year = rawYear ? Number(rawYear) : new Date().getFullYear();
      return new Date(year, monthIndex, Number(day));
    }
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getDateSortValue(value: string | Date): number {
  return parseDateValue(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
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
