import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    await db.update(users).set({ hostGuidelinesAgreedAt: new Date() }).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}