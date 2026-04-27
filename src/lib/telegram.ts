/**
 * Telegram notifications for admin chat
 * Requires: TELEGRAM_BOT_TOKEN env var
 * Chat is fixed to -5172233799
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// Safety guard: all notifications must go only to this chat.
const TELEGRAM_CHAT_ID = "-5172233799";

function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
}

/**
 * Send a message to Telegram chat
 * @param message Text message (supports Markdown)
 * @param parseMode "HTML" or "Markdown" (default: "HTML")
 */
export async function sendTelegramMessage(
  message: string,
  parseMode: "HTML" | "Markdown" = "HTML",
): Promise<{ success: boolean; error?: string }> {
  if (!isTelegramConfigured()) {
    return { success: false, error: "Telegram not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: parseMode,
      }),
    });

    const result = (await response.json()) as { ok?: boolean; error_code?: number; description?: string };
    if (!response.ok || !result.ok) {
      return {
        success: false,
        error: `Telegram API error: ${result.description ?? "Unknown error"}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Failed to send Telegram message: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type TelegramField = {
  label: string;
  value: string;
  asCode?: boolean;
  boldValue?: boolean;
};

type TelegramLink = {
  text: string;
  href: string;
};

type TelegramBookingEvent = {
  title: string;
  fields: TelegramField[];
  links?: TelegramLink[];
  footer?: string;
};

function formatTelegramField(field: TelegramField): string {
  const safeLabel = escapeHtml(field.label);
  const safeValue = escapeHtml(field.value);
  let rendered = safeValue;

  if (field.asCode) {
    rendered = `<code>${safeValue}</code>`;
  } else if (field.boldValue) {
    rendered = `<b>${safeValue}</b>`;
  }

  return `<b>${safeLabel}:</b> ${rendered}`;
}

function buildTelegramBookingMessage(event: TelegramBookingEvent): string {
  const parts: string[] = [];
  parts.push(`<b>${escapeHtml(event.title)}</b>`);
  parts.push("");

  for (const field of event.fields) {
    parts.push(formatTelegramField(field));
  }

  if (event.links && event.links.length > 0) {
    parts.push("");
    for (const link of event.links) {
      parts.push(`<a href="${escapeHtml(link.href)}">${escapeHtml(link.text)}</a>`);
    }
  }

  if (event.footer) {
    parts.push("");
    parts.push(`<i>${escapeHtml(event.footer)}</i>`);
  }

  return parts.join("\n");
}

async function notifyBookingEvent(event: TelegramBookingEvent): Promise<void> {
  if (!isTelegramConfigured()) return;
  const message = buildTelegramBookingMessage(event);
  await sendTelegramMessage(message);
}

/**
 * Notify admin about new booking
 */
export async function notifyNewBooking(input: {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  sector: string;
  totalPrice: number;
}): Promise<void> {
  await notifyBookingEvent({
    title: "🎫 Нова бронь",
    fields: [
      { label: "ID", value: input.bookingId, asCode: true },
      { label: "Клієнт", value: `${input.clientName} (${input.clientPhone})` },
      { label: "Дата", value: input.date },
      { label: "Час", value: `${input.startTime} - ${input.endTime}` },
      { label: "Поле", value: input.sector },
      { label: "Ціна", value: `${input.totalPrice} грн`, boldValue: true },
    ],
    footer: "Статус: Очікує підтвердження",
  });
}

/**
 * Notify admin about payment received
 */
export async function notifyPaymentReceived(input: {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  startTime: string;
  sector: string;
  totalPrice: number;
}): Promise<void> {
  await notifyBookingEvent({
    title: "✅ Оплата отримана",
    fields: [
      { label: "ID", value: input.bookingId, asCode: true },
      { label: "Клієнт", value: `${input.clientName} (${input.clientPhone})` },
      { label: "Дата", value: input.date },
      { label: "Час", value: input.startTime },
      { label: "Поле", value: input.sector },
      { label: "Сума", value: `${input.totalPrice} грн`, boldValue: true },
    ],
  });
}

/**
 * Notify admin about booking cancellation
 */
export async function notifyBookingCancelled(input: {
  bookingId: string;
  clientName: string;
  date: string;
  startTime: string;
  sector: string;
}): Promise<void> {
  await notifyBookingEvent({
    title: "❌ Бронь скасована",
    fields: [
      { label: "ID", value: input.bookingId, asCode: true },
      { label: "Клієнт", value: input.clientName },
      { label: "Дата", value: input.date },
      { label: "Час", value: input.startTime },
      { label: "Поле", value: input.sector },
    ],
  });
}

/**
 * Notify admin about payment verification needed
 */
export async function notifyPaymentVerification(input: {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  date: string;
  sector: string;
  totalPrice: number;
  proofUrl: string;
  adminBookingUrl?: string;
}): Promise<void> {
  const links: TelegramLink[] = [{ text: "Переглянути квитанцію", href: input.proofUrl }];
  if (input.adminBookingUrl) {
    links.push({ text: "Відкрити бронювання в адмінці", href: input.adminBookingUrl });
  }

  await notifyBookingEvent({
    title: "⏳ Оплата на перевірці",
    fields: [
      { label: "№ бронювання", value: input.bookingId, asCode: true },
      { label: "Клієнт", value: `${input.clientName} (${input.clientPhone})` },
      { label: "Дата", value: input.date },
      { label: "Поле", value: input.sector },
      { label: "Сума", value: `${input.totalPrice} грн`, boldValue: true },
    ],
    links,
  });
}
