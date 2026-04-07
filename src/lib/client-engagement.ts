import { promises as fs } from "node:fs";
import path from "node:path";

import { getBookings } from "@/lib/bookings";

const notificationsPath = path.join(process.cwd(), "src", "data", "client-notifications.json");
const reviewsPath = path.join(process.cwd(), "src", "data", "client-reviews.json");

export type ClientNotification = {
  id: string;
  clientUserId?: string;
  phone: string;
  title: string;
  message: string;
  kind: "info" | "success" | "warning";
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
};

export type ClientReview = {
  id: string;
  bookingId: string;
  clientUserId?: string;
  phone: string;
  rating: number;
  text: string;
  createdAt: string;
};

export type PublicClientReview = {
  id: string;
  bookingId: string;
  rating: number;
  text: string;
  createdAt: string;
  clientName: string;
  sector: string;
  bookingDate: string;
};

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

export async function getClientNotifications(userId: string, phone: string): Promise<ClientNotification[]> {
  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  return all
    .filter((item) => item.clientUserId === userId || (!item.clientUserId && item.phone === phone))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addClientNotification(
  userId: string,
  phone: string,
  title: string,
  message: string,
  kind: ClientNotification["kind"] = "info",
): Promise<ClientNotification> {
  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  const notification: ClientNotification = {
    id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientUserId: userId,
    phone,
    title,
    message,
    kind,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  all.push(notification);
  await writeJsonFile(notificationsPath, all);
  return notification;
}

export async function getUnreadClientNotificationsCount(userId: string, phone: string): Promise<number> {
  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  return all.filter((item) => {
    const belongsToUser = item.clientUserId === userId || (!item.clientUserId && item.phone === phone);
    return belongsToUser && !item.isRead;
  }).length;
}

export async function markClientNotificationsRead(userId: string, phone: string): Promise<void> {
  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  let changed = false;

  for (let index = 0; index < all.length; index += 1) {
    const item = all[index];
    const belongsToUser = item.clientUserId === userId || (!item.clientUserId && item.phone === phone);
    if (belongsToUser && !item.isRead) {
      all[index] = {
        ...item,
        isRead: true,
        readAt: new Date().toISOString(),
      };
      changed = true;
    }
  }

  if (changed) {
    await writeJsonFile(notificationsPath, all);
  }
}

export async function getClientReviews(userId: string, phone: string): Promise<ClientReview[]> {
  const all = await readJsonFile<ClientReview[]>(reviewsPath, []);
  return all
    .filter((item) => item.clientUserId === userId || (!item.clientUserId && item.phone === phone))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getClientReviewByBooking(
  userId: string,
  phone: string,
  bookingId: string,
): Promise<ClientReview | null> {
  const all = await readJsonFile<ClientReview[]>(reviewsPath, []);
  return all.find(
    (item) => item.bookingId === bookingId && (item.clientUserId === userId || item.phone === phone),
  ) ?? null;
}

export async function createClientReview(
  userId: string,
  phone: string,
  bookingId: string,
  rating: number,
  text: string,
): Promise<ClientReview> {
  const normalizedRating = Math.max(1, Math.min(5, Math.round(rating)));
  const all = await readJsonFile<ClientReview[]>(reviewsPath, []);
  const exists = all.some(
    (item) => item.bookingId === bookingId && (item.clientUserId === userId || item.phone === phone),
  );
  if (exists) {
    throw new Error("Відгук для цього бронювання вже залишено");
  }

  const review: ClientReview = {
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    bookingId,
    clientUserId: userId,
    phone,
    rating: normalizedRating,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  all.push(review);
  await writeJsonFile(reviewsPath, all);
  return review;
}

export async function migrateClientEngagementIdentity(userId: string, oldPhone: string, newPhone: string): Promise<void> {
  const notifications = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  let notificationsChanged = false;

  for (let index = 0; index < notifications.length; index += 1) {
    const item = notifications[index];
    if (item.clientUserId === userId || (!item.clientUserId && item.phone === oldPhone)) {
      notifications[index] = {
        ...item,
        clientUserId: userId,
        phone: newPhone,
      };
      notificationsChanged = true;
    }
  }

  if (notificationsChanged) {
    await writeJsonFile(notificationsPath, notifications);
  }

  const reviews = await readJsonFile<ClientReview[]>(reviewsPath, []);
  let reviewsChanged = false;

  for (let index = 0; index < reviews.length; index += 1) {
    const item = reviews[index];
    if (item.clientUserId === userId || (!item.clientUserId && item.phone === oldPhone)) {
      reviews[index] = {
        ...item,
        clientUserId: userId,
        phone: newPhone,
      };
      reviewsChanged = true;
    }
  }

  if (reviewsChanged) {
    await writeJsonFile(reviewsPath, reviews);
  }
}

export async function getPublicClientReviews(limit?: number): Promise<PublicClientReview[]> {
  const [reviews, bookings] = await Promise.all([
    readJsonFile<ClientReview[]>(reviewsPath, []),
    getBookings(),
  ]);

  const bookingById = new Map(bookings.map((item) => [item.id, item]));

  const publicReviews = reviews
    .filter((item) => item.text.trim().length > 0)
    .map((item) => {
      const booking = bookingById.get(item.bookingId);
      return {
        id: item.id,
        bookingId: item.bookingId,
        rating: item.rating,
        text: item.text.trim(),
        createdAt: item.createdAt,
        clientName: booking?.clientName || "Клієнт",
        sector: booking?.sector || "—",
        bookingDate: booking?.date || "",
      } satisfies PublicClientReview;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (typeof limit === "number") {
    return publicReviews.slice(0, Math.max(0, limit));
  }

  return publicReviews;
}
