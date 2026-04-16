import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CmsContent } from "@/data/cms-defaults";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getCmsContent, saveCmsContent } from "@/lib/cms-content";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const content = await getCmsContent();
  return NextResponse.json({ content });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Не авторизовано" }, { status: 401 });
  }
  if (session.role !== "superadmin") {
    return NextResponse.json({ error: "Недостатньо прав" }, { status: 403 });
  }

  const body = (await request.json()) as { content?: CmsContent };

  if (!body.content) {
    return NextResponse.json({ error: "Відсутній контент для збереження" }, { status: 400 });
  }

  await saveCmsContent(body.content);

  revalidatePath("/");
  revalidatePath("/gallery");
  revalidatePath("/news");
  revalidatePath("/reviews");
  revalidatePath("/payment-terms");
  revalidatePath("/privacy-policy");
  revalidatePath("/rules");

  return NextResponse.json({ ok: true });
}
