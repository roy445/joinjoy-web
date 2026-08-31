import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, shopItems, userInventory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { sanitize, isSameOrigin } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    const [full] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (full?.activeAvatarFrame) {
      const [ownedFrame] = await db.select({ name: shopItems.name }).from(userInventory).innerJoin(shopItems, eq(userInventory.itemId, shopItems.id)).where(and(eq(userInventory.userId, user.id), eq(shopItems.type, "frame"), eq(shopItems.name, full.activeAvatarFrame))).limit(1);
      if (!ownedFrame) full.activeAvatarFrame = null;
    }
    return NextResponse.json({ user: full }, { headers: { "Cache-Control": "no-store, max-age=0" } });
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
    if (body.activeAvatarFrame !== undefined) {
      if (body.activeAvatarFrame === null || body.activeAvatarFrame === "") {
        updates.activeAvatarFrame = null;
      } else {
        const [ownedFrame] = await db.select({ name: shopItems.name }).from(userInventory).innerJoin(shopItems, eq(userInventory.itemId, shopItems.id)).where(and(eq(userInventory.userId, user.id), eq(shopItems.type, "frame"), eq(shopItems.name, String(body.activeAvatarFrame)))).limit(1);
        if (!ownedFrame) throw new Error("只能套用已購買或已獲得的頭像框");
        updates.activeAvatarFrame = ownedFrame.name;
      }
    }
    if (Array.isArray(body.interests)) updates.interests = body.interests.slice(0, 12).map((s: string) => sanitize(s, 20));
    if (body.gender === "male" || body.gender === "female" || body.gender === null) updates.gender = body.gender;
    if (body.age === null || (Number.isInteger(Number(body.age)) && Number(body.age) > 0)) updates.age = body.age ? Number(body.age) : null;

    const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning();
    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    return errorResponse(err);
  }
}
