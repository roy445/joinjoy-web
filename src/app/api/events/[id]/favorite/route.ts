import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);

    const [existing] = await db.select().from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.eventId, eventId))).limit(1);
    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return NextResponse.json({ ok: true, favorited: false });
    }
    await db.insert(favorites).values({ userId: user.id, eventId });
    return NextResponse.json({ ok: true, favorited: true });
  } catch (err) {
    return errorResponse(err);
  }
}
