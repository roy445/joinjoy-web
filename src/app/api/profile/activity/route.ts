import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events, favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

const eventFields = {
  id: events.id,
  title: events.title,
  coverUrl: events.coverUrl,
  category: events.category,
  startAt: events.startAt,
  endAt: events.endAt,
  location: events.location,
  status: events.status,
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });

    const [hosted, joined, favoriteEvents, [hostedCount], [joinedCount], [favoriteCount]] = await Promise.all([
      db.select(eventFields).from(events).where(eq(events.hostId, user.id)).orderBy(desc(events.startAt)).limit(20),
      db.select({ ...eventFields, participantStatus: eventParticipants.status, joinedAt: eventParticipants.joinedAt }).from(eventParticipants).innerJoin(events, eq(eventParticipants.eventId, events.id)).where(and(eq(eventParticipants.userId, user.id), inArray(eventParticipants.status, ["joined", "pending", "waitlisted"]))).orderBy(desc(eventParticipants.joinedAt)).limit(20),
      db.select({ ...eventFields, savedAt: favorites.createdAt }).from(favorites).innerJoin(events, eq(favorites.eventId, events.id)).where(eq(favorites.userId, user.id)).orderBy(desc(favorites.createdAt)).limit(20),
      db.select({ count: sql<number>`count(*)::int` }).from(events).where(eq(events.hostId, user.id)),
      db.select({ count: sql<number>`count(*)::int` }).from(eventParticipants).where(and(eq(eventParticipants.userId, user.id), inArray(eventParticipants.status, ["joined", "pending", "waitlisted"]))),
      db.select({ count: sql<number>`count(*)::int` }).from(favorites).where(eq(favorites.userId, user.id)),
    ]);

    return NextResponse.json({
      stats: { hosted: hostedCount?.count ?? 0, joined: joinedCount?.count ?? 0, favorites: favoriteCount?.count ?? 0, creditScore: user.creditScore },
      activities: { hosted, joined, favorites: favoriteEvents },
    });
  } catch (error) {
    console.error("[profile/activity] error", error);
    return NextResponse.json({ message: "目前無法取得活動紀錄" }, { status: 500 });
  }
}
