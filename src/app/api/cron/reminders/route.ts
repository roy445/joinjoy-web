import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventParticipants } from "@/db/schema";
import { eq, and, gte, isNull, lte, ne } from "drizzle-orm";
import { notifyMany } from "@/lib/notify";
import { clientKey, rateLimit } from "@/lib/security";

// Notifies participants of events starting within the next 24 hours.
export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const suppliedSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  if (expectedSecret && suppliedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(clientKey(req, "cron-reminders"), 1, 5 * 60 * 1000)) return NextResponse.json({ error: "提醒工作正在處理中，請稍後再試" }, { status: 429 });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const upcoming = await db
    .select({ id: events.id, title: events.title, eventDate: events.eventDate, startTime: events.startTime, hostId: events.hostId })
    .from(events)
    .where(and(isNull(events.reminderSentAt), gte(events.eventDate, today), lte(events.eventDate, tomorrow), ne(events.status, "cancelled"), ne(events.status, "completed")))
    .limit(500);

  const nowMs = Date.now();
  let sent = 0;
  for (const event of upcoming) {
    const eventTime = new Date(`${event.eventDate}T${event.startTime}:00`).getTime();
    const hoursUntil = (eventTime - nowMs) / 3600000;
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
