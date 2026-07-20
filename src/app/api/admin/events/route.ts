import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users, eventParticipants } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notifyMany } from "@/lib/notify";

export async function GET() {
  try {
    await requireAdmin();
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
        status: events.status,
        isPrivate: events.isPrivate,
        hostId: events.hostId,
        hostName: users.name,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
        createdAt: events.createdAt,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
      .orderBy(desc(events.createdAt));

    return NextResponse.json({ events: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) throw new Error("缺少 ID");

    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    if (!event) throw new Error("找不到活動");

    const participants = await db.select({ userId: eventParticipants.userId }).from(eventParticipants).where(eq(eventParticipants.eventId, id));
    await db.delete(events).where(eq(events.id, id));

    await notifyMany(participants.map((p) => p.userId), {
      type: "event_deleted_admin",
      title: "活動已被管理員移除",
      content: `「${event.title}」因違反平台規範已被下架`,
    });
    await logAdminAction(admin.id, "刪除活動", "event", id, event.title);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
