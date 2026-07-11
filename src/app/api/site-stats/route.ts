import { and, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events, users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();
    const [[memberResult], [eventResult], [upcomingResult], [participantResult]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.status, "active")),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(and(eq(events.visibility, "public"), eq(events.status, "active"))),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(and(eq(events.visibility, "public"), eq(events.status, "active"), gte(events.startAt, now))),
      db.select({ count: sql<number>`count(*)::int` }).from(eventParticipants).where(eq(eventParticipants.status, "joined")),
    ]);
    const categoryRows = await db
      .select({ category: events.category, count: sql<number>`count(*)::int` })
      .from(events)
      .where(and(eq(events.visibility, "public"), eq(events.status, "active")))
      .groupBy(events.category);

    return NextResponse.json({
      stats: {
        members: memberResult?.count ?? 0,
        events: eventResult?.count ?? 0,
        upcomingEvents: upcomingResult?.count ?? 0,
        participants: participantResult?.count ?? 0,
        categories: Object.fromEntries(categoryRows.map((row) => [row.category, row.count])),
        generatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("[site-stats] error", error);
    return NextResponse.json({ message: "目前無法取得網站統計" }, { status: 500 });
  }
}
