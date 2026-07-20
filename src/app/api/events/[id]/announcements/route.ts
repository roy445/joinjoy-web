import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventAnnouncements, events, eventParticipants, users, eventChatMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, isSameOrigin, rateLimit, clientKey } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const eventId = Number(idStr);
  const rows = await db
    .select({
      id: eventAnnouncements.id,
      content: eventAnnouncements.content,
      createdAt: eventAnnouncements.createdAt,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(eventAnnouncements)
    .leftJoin(users, eq(eventAnnouncements.userId, users.id))
    .where(eq(eventAnnouncements.eventId, eventId))
    .orderBy(desc(eventAnnouncements.createdAt));
  return NextResponse.json({ announcements: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    if (!rateLimit(clientKey(req, `announce-${user.id}`), 10, 30 * 60 * 1000)) throw new Error("發布太頻繁");

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");
    if (event.hostId !== user.id && user.role !== "admin") throw new Error("僅揪主可發布公告");

    const body = await req.json().catch(() => null);
    const content = sanitize(String(body?.content || ""), 1000);
    if (!content) throw new Error("請輸入公告內容");

    const [announcement] = await db.insert(eventAnnouncements).values({ eventId, userId: user.id, content }).returning();
    await db.insert(eventChatMessages).values({ eventId, userId: user.id, type: "announcement", content });

    const members = await db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "approved")));
    await notifyMany(members.map((m) => m.userId).filter((id) => id !== user.id), {
      type: "event_announcement",
      title: `「${event.title}」發布新公告`,
      content,
      link: `/events/${eventId}`,
    });

    return NextResponse.json({ ok: true, announcement: { ...announcement, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    return errorResponse(err);
  }
}
