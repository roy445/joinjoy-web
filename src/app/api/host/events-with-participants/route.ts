import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventParticipants, users } from "@/db/schema";
import { eq, desc, ne, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

// Powers the "which event did this person no-show / misbehave at?" selector
// in the host blacklist-request form: only events the current user hosts,
// each with the list of people who actually registered for it.
export async function GET() {
  try {
    const user = await requireUser();

    const hostedEvents = await db
      .select({ id: events.id, title: events.title, eventDate: events.eventDate })
      .from(events)
      .where(eq(events.hostId, user.id))
      .orderBy(desc(events.eventDate));

    const results = [];
    for (const event of hostedEvents) {
      const participants = await db
        .select({ userId: eventParticipants.userId, name: users.name, status: eventParticipants.status })
        .from(eventParticipants)
        .leftJoin(users, eq(eventParticipants.userId, users.id))
        .where(and(eq(eventParticipants.eventId, event.id), ne(eventParticipants.userId, user.id)));

      if (participants.length > 0) {
        results.push({ ...event, participants });
      }
    }

    return NextResponse.json({ events: results });
  } catch (err) {
    return errorResponse(err);
  }
}