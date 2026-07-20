import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ratings, events, eventParticipants, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { sanitize, isSameOrigin } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const eventId = Number(idStr);
  const rows = await db.select().from(ratings).where(eq(ratings.eventId, eventId));
  return NextResponse.json({ ratings: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");

    const body = await req.json().catch(() => null);
    const rateeId = Number(body?.rateeId);
    if (!rateeId) throw new Error("請選擇評價對象");
    if (rateeId === user.id) throw new Error("無法評價自己");

    const isParticipant = event.hostId === user.id || (await db.select().from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id), eq(eventParticipants.status, "approved"))).then((r) => r.length > 0));
    if (!isParticipant) throw new Error("僅活動參與者可進行評價");

    const [existing] = await db.select().from(ratings).where(and(eq(ratings.eventId, eventId), eq(ratings.raterId, user.id), eq(ratings.rateeId, rateeId))).limit(1);
    if (existing) throw new Error("您已經評價過此對象");

    const punctuality = Math.max(1, Math.min(5, Number(body?.punctuality) || 3));
    const friendliness = Math.max(1, Math.min(5, Number(body?.friendliness) || 3));
    const overall = Math.max(1, Math.min(5, Number(body?.overall) || 3));
    const noShow = !!body?.noShow;
    const comment = sanitize(String(body?.comment || ""), 500);

    await db.insert(ratings).values({ eventId, raterId: user.id, rateeId, punctuality, friendliness, overall, noShow, comment });

    // Update ratee's credit score: weighted rolling average, penalize no-shows heavily.
    const allRatings = await db.select().from(ratings).where(eq(ratings.rateeId, rateeId));
    const avgOverall = allRatings.reduce((sum, r) => sum + r.overall, 0) / allRatings.length;
    const noShowCount = allRatings.filter((r) => r.noShow).length;
    let score = 60 + avgOverall * 8 - noShowCount * 10;
    score = Math.max(0, Math.min(100, score));

    await db
      .update(users)
      .set({ creditScore: score.toFixed(2), noShowCount: sql`${users.noShowCount} + ${noShow ? 1 : 0}` })
      .where(eq(users.id, rateeId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
