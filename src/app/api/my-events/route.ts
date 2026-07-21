import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventParticipants, users, createEventRequests } from "@/db/schema";
import { eq, and, desc, ne, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const participantCountSub = db
      .select({ eventId: eventParticipants.eventId, count: sql<number>`count(*)`.as("count") })
      .from(eventParticipants)
      .where(eq(eventParticipants.status, "approved"))
      .groupBy(eventParticipants.eventId)
      .as("pc");

    const hosting = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        status: events.status,
        capacity: events.capacity,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      })
      .from(events)
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
      .where(eq(events.hostId, user.id))
      .orderBy(desc(events.createdAt));

    const joined = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        status: events.status,
        capacity: events.capacity,
        hostName: users.name,
        myStatus: eventParticipants.status,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      })
      .from(eventParticipants)
      .innerJoin(events, eq(eventParticipants.eventId, events.id))
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
      .where(and(eq(eventParticipants.userId, user.id), ne(eventParticipants.status, "cancelled")))
      .orderBy(desc(events.eventDate));

    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const requests = await db.select().from(createEventRequests).where(eq(createEventRequests.userId, user.id)).orderBy(desc(createEventRequests.createdAt));

    return NextResponse.json({
      hosting,
      joined: joined.filter((j) => j.hostName !== undefined),
      createPermission: {
        canCreateEvent: fullUser.canCreateEvent,
        credits: fullUser.eventCreateCredits,
        isAdmin: user.role === "admin",
        hasAgreedHostGuidelines: !!fullUser.hostGuidelinesAgreedAt,
      },
      requests,
    });
  } catch (err) {
    return errorResponse(err);
  }
}