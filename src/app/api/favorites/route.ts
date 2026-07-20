import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites, events, users, eventParticipants } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const participantCountSub = db
      .select({ eventId: eventParticipants.eventId, count: sql<number>`count(*)`.as("count") })
      .from(eventParticipants)
      .where(eq(eventParticipants.status, "approved"))
      .groupBy(eventParticipants.eventId)
      .as("pc");

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        meetingLocation: events.meetingLocation,
        capacity: events.capacity,
        fee: events.fee,
        status: events.status,
        hostName: users.name,
        hostAvatar: users.avatarUrl,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
        favoritedAt: favorites.createdAt,
      })
      .from(favorites)
      .innerJoin(events, eq(favorites.eventId, events.id))
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
      .where(eq(favorites.userId, user.id))
      .orderBy(desc(favorites.createdAt));

    return NextResponse.json({ events: rows.map((r) => ({ ...r, remaining: Math.max(0, r.capacity - Number(r.participantCount)) })) });
  } catch (err) {
    return errorResponse(err);
  }
}
