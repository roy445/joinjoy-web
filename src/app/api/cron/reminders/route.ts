import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventParticipants, users } from "@/db/schema";
import { eq, and, isNull, ne } from "drizzle-orm";
import { notifyMany } from "@/lib/notify";

// Triggered opportunistically (e.g. from the home page) to simulate a push-reminder
// scheduler: notifies participants of events starting within the next 24 hours.
export async function GET() {
  const upcoming = await db
    .select()
    .from(events)
    .where(and(isNull(events.reminderSentAt), ne(events.status, "cancelled"), ne(events.status, "completed")));

  const now = Date.now();
  let sent = 0;

  for (const event of upcoming) {
    const eventTime = new Date(`${event.eventDate}T${event.startTime}:00`).getTime();
    const hoursUntil = (eventTime - now) / 3600000;
    if (hoursUntil > 0 && hoursUntil <= 24) {
      const participants = await db
        .select({ userId: eventParticipants.userId })
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.status, "approved")));
      const targets = [...new Set([event.hostId, ...participants.map((p) => p.userId)])];
      await notifyMany(targets, {
        type: "event_reminder",
        title: "活動即將開始",
        content: `「${event.title}」將於 ${event.eventDate} ${event.startTime} 開始，別忘了準時出席！`,
        link: `/events/${event.id}`,
      });
      await db.update(events).set({ reminderSentAt: new Date() }).where(eq(events.id, event.id));
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
