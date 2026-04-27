import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { CmsContent } from "@/data/cms-defaults";
import { requireAdminSession } from "@/lib/api-admin-auth";
import { getCmsContent, saveCmsContent } from "@/lib/cms-content";
import { serviceUnavailable } from "@/lib/api-errors";

export async function GET() {
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;

  try {
    const content = await getCmsContent();
    return NextResponse.json({ content });
  } catch (error) {
    return serviceUnavailable("Не вдалося завантажити контент", error);
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession({ role: "superadmin" });
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as { content?: CmsContent };

  if (!body.content) {
    return NextResponse.json({ error: "Відсутній контент для збереження" }, { status: 400 });
  }

  try {
    await saveCmsContent(body.content);

    revalidatePath("/");
    revalidatePath("/gallery");
    revalidatePath("/news");
    revalidatePath("/reviews");
    revalidatePath("/payment-terms");
    revalidatePath("/privacy-policy");
    revalidatePath("/rules");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serviceUnavailable("Не вдалося зберегти контент", error);
  }
}
