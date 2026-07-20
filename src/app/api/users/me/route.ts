import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { sanitize, isSameOrigin } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    const [full] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    return NextResponse.json({ user: full });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    if (!body) throw new Error("格式錯誤");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string") updates.name = sanitize(body.name, 50) || user.name;
    if (typeof body.bio === "string") updates.bio = sanitize(body.bio, 500);
    if (typeof body.avatarUrl === "string") updates.avatarUrl = body.avatarUrl;
    if (Array.isArray(body.interests)) updates.interests = body.interests.slice(0, 12).map((s: string) => sanitize(s, 20));
    if (body.gender === "male" || body.gender === "female" || body.gender === null) updates.gender = body.gender;
    if (body.age === null || (Number.isInteger(Number(body.age)) && Number(body.age) > 0)) updates.age = body.age ? Number(body.age) : null;

    await db.update(users).set(updates).where(eq(users.id, user.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
