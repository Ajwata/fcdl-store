import { promises as fs } from "node:fs";
import path from "node:path";

import { getBookings } from "@/lib/bookings";
import { getPrismaClient, isDatabaseEnabled, isStrictDatabaseMode } from "@/lib/prisma";

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

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "");
}

function notificationFromDb(row: {
  id: string;
  clientUserId: string | null;
  phone: string;
  title: string;
  message: string;
  kind: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}): ClientNotification {
  return {
    id: row.id,
    clientUserId: row.clientUserId ?? undefined,
    phone: row.phone,
    title: row.title,
    message: row.message,
    kind: row.kind as ClientNotification["kind"],
    isRead: row.isRead,
    readAt: row.readAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function reviewFromDb(row: {
  id: string;
  bookingId: string;
  clientUserId: string | null;
  phone: string;
  rating: number;
  text: string;
  createdAt: Date;
}): ClientReview {
  return {
    id: row.id,
    bookingId: row.bookingId,
    clientUserId: row.clientUserId ?? undefined,
    phone: row.phone,
    rating: row.rating,
    text: row.text,
    createdAt: row.createdAt.toISOString(),
  };
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  if (isStrictDatabaseMode()) {
    throw new Error("JSON fallback is disabled for client-engagement in strict database mode");
  }

  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  if (isStrictDatabaseMode()) {
    throw new Error("JSON fallback is disabled for client-engagement in strict database mode");
  }

  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

export async function getClientNotifications(userId: string, phone: string): Promise<ClientNotification[]> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const all = await prisma.clientNotification.findMany({
      where: {
        OR: [
          { clientUserId: userId },
          { clientUserId: null, phoneKey: phoneKey(phone) },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return all.map(notificationFromDb);
  }

  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  return all
    .filter((item) => item.clientUserId === userId || (!item.clientUserId && item.phone === phone))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addClientNotification(
  userId: string | undefined,
  phone: string,
  title: string,
  message: string,
  kind: ClientNotification["kind"] = "info",
): Promise<ClientNotification> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const created = await prisma.clientNotification.create({
      data: {
        id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        clientUserId: userId ?? null,
        phone,
        phoneKey: phoneKey(phone),
        title,
        message,
        kind,
        isRead: false,
        createdAt: new Date(),
      },
    });
    return notificationFromDb(created);
  }

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
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    return prisma.clientNotification.count({
      where: {
        isRead: false,
        OR: [
          { clientUserId: userId },
          { clientUserId: null, phoneKey: phoneKey(phone) },
        ],
      },
    });
  }

  const all = await readJsonFile<ClientNotification[]>(notificationsPath, []);
  return all.filter((item) => {
    const belongsToUser = item.clientUserId === userId || (!item.clientUserId && item.phone === phone);
    return belongsToUser && !item.isRead;
  }).length;
}

export async function markClientNotificationsRead(userId: string, phone: string): Promise<void> {
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.clientNotification.updateMany({
      where: {
        isRead: false,
        OR: [
          { clientUserId: userId },
          { clientUserId: null, phoneKey: phoneKey(phone) },
        ],
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return;
  }

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
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const all = await prisma.clientReview.findMany({
      where: {
        OR: [
          { clientUserId: userId },
          { clientUserId: null, phoneKey: phoneKey(phone) },
        ],
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return all.map(reviewFromDb);
  }

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
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const review = await prisma.clientReview.findFirst({
      where: {
        bookingId,
        OR: [
          { clientUserId: userId },
          { phoneKey: phoneKey(phone) },
        ],
      },
    });
    return review ? reviewFromDb(review) : null;
  }

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

  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    const exists = await prisma.clientReview.findFirst({
      where: {
        bookingId,
        OR: [
          { clientUserId: userId },
          { phoneKey: phoneKey(phone) },
        ],
      },
    });
    if (exists) {
      throw new Error("Відгук для цього бронювання вже залишено");
    }

    const created = await prisma.clientReview.create({
      data: {
        id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        bookingId,
        clientUserId: userId,
        phone,
        phoneKey: phoneKey(phone),
        rating: normalizedRating,
        text: text.trim(),
        createdAt: new Date(),
      },
    });
    return reviewFromDb(created);
  }

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
  if (isDatabaseEnabled()) {
    const prisma = getPrismaClient();
    await prisma.$transaction([
      prisma.clientNotification.updateMany({
        where: {
          OR: [
            { clientUserId: userId },
            { clientUserId: null, phoneKey: phoneKey(oldPhone) },
          ],
        },
        data: {
          clientUserId: userId,
          phone: newPhone,
          phoneKey: phoneKey(newPhone),
        },
      }),
      prisma.clientReview.updateMany({
        where: {
          OR: [
            { clientUserId: userId },
            { clientUserId: null, phoneKey: phoneKey(oldPhone) },
          ],
        },
        data: {
          clientUserId: userId,
          phone: newPhone,
          phoneKey: phoneKey(newPhone),
        },
      }),
    ]);
    return;
  }

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
    isDatabaseEnabled()
      ? getPrismaClient()
          .clientReview.findMany({ orderBy: [{ createdAt: "desc" }] })
          .then((rows: Array<{
            id: string;
            bookingId: string;
            clientUserId: string | null;
            phone: string;
            rating: number;
            text: string;
            createdAt: Date;
          }>) => rows.map(reviewFromDb))
      : readJsonFile<ClientReview[]>(reviewsPath, []),
    getBookings(),
  ]);

  const bookingById = new Map(bookings.map((item) => [item.id, item]));

  const publicReviews = reviews
    .filter((item: ClientReview) => item.text.trim().length > 0)
    .map((item: ClientReview) => {
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
    .sort((a: PublicClientReview, b: PublicClientReview) => b.createdAt.localeCompare(a.createdAt));

  if (typeof limit === "number") {
    return publicReviews.slice(0, Math.max(0, limit));
  }

  return publicReviews;
}
