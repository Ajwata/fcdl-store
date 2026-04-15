/**
 * Telegram notifications for admin chat
 * Requires: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

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
  if (!isTelegramConfigured()) return;

  const message = `
<b>🎫 Нова бронь</b>

<b>ID:</b> <code>${escapeHtml(input.bookingId)}</code>
<b>Клієнт:</b> ${escapeHtml(input.clientName)} (${escapeHtml(input.clientPhone)})
<b>Дата:</b> ${escapeHtml(input.date)}
<b>Час:</b> ${escapeHtml(input.startTime)} - ${escapeHtml(input.endTime)}
<b>Поле:</b> ${escapeHtml(input.sector)}
<b>Ціна:</b> <b>${input.totalPrice} грн</b>

<i>Статус: Очікує підтвердження</i>
  `.trim();

  await sendTelegramMessage(message);
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
  if (!isTelegramConfigured()) return;

  const message = `
<b>✅ Оплата отримана</b>

<b>ID:</b> <code>${escapeHtml(input.bookingId)}</code>
<b>Клієнт:</b> ${escapeHtml(input.clientName)} (${escapeHtml(input.clientPhone)})
<b>Дата:</b> ${escapeHtml(input.date)}
<b>Час:</b> ${escapeHtml(input.startTime)}
<b>Поле:</b> ${escapeHtml(input.sector)}
<b>Сума:</b> <b>${input.totalPrice} грн</b>
  `.trim();

  await sendTelegramMessage(message);
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
  if (!isTelegramConfigured()) return;

  const message = `
<b>❌ Бронь скасована</b>

<b>ID:</b> <code>${escapeHtml(input.bookingId)}</code>
<b>Клієнт:</b> ${escapeHtml(input.clientName)}
<b>Дата:</b> ${escapeHtml(input.date)}
<b>Час:</b> ${escapeHtml(input.startTime)}
<b>Поле:</b> ${escapeHtml(input.sector)}
  `.trim();

  await sendTelegramMessage(message);
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
}): Promise<void> {
  if (!isTelegramConfigured()) return;

  const message = `
<b>⏳ Оплата на перевірці</b>

<b>№ бронювання:</b> <code>${escapeHtml(input.bookingId)}</code>
<b>Клієнт:</b> ${escapeHtml(input.clientName)} (${escapeHtml(input.clientPhone)})
<b>Дата:</b> ${escapeHtml(input.date)}
<b>Поле:</b> ${escapeHtml(input.sector)}
<b>Сума:</b> <b>${input.totalPrice} грн</b>

<a href="${escapeHtml(input.proofUrl)}">Переглянути квитанцію</a>
  `.trim();

  await sendTelegramMessage(message);
}
