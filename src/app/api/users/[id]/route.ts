import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, events, eventParticipants, ratings, blacklist } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });

  const [hostedCount] = await db.select({ count: sql<number>`count(*)` }).from(events).where(eq(events.hostId, id));
  const [attendedCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventParticipants)
    .where(and(eq(eventParticipants.userId, id), eq(eventParticipants.status, "approved")));

  const userRatings = await db.select().from(ratings).where(eq(ratings.rateeId, id));
  const avg = (key: "punctuality" | "friendliness" | "overall") =>
    userRatings.length ? userRatings.reduce((s, r) => s + r[key], 0) / userRatings.length : null;

  const [blacklistEntry] = await db.select().from(blacklist).where(and(eq(blacklist.userId, id), eq(blacklist.active, true))).limit(1);

  const hostedEvents = await db
    .select({ id: events.id, title: events.title, coverImageUrl: events.coverImageUrl, eventDate: events.eventDate, status: events.status })
    .from(events)
    .where(eq(events.hostId, id))
    .orderBy(sql`${events.eventDate} desc`)
    .limit(12);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      interests: user.interests,
      creditScore: user.creditScore,
      isBlacklisted: user.isBlacklisted,
      blacklistReason: blacklistEntry?.reason ?? null,
      noShowCount: user.noShowCount,
      createdAt: user.createdAt,
    },
    stats: {
      hostedCount: Number(hostedCount?.count ?? 0),
      attendedCount: Number(attendedCount?.count ?? 0),
      avgPunctuality: avg("punctuality"),
      avgFriendliness: avg("friendliness"),
      avgOverall: avg("overall"),
      totalRatings: userRatings.length,
    },
    hostedEvents,
  });
}
