import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventComments, users, events } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { sanitize, looksLikeSpam, rateLimit, clientKey, isSameOrigin } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const eventId = Number(idStr);
  const rows = await db
    .select({
      id: eventComments.id,
      content: eventComments.content,
      createdAt: eventComments.createdAt,
      isDeleted: eventComments.isDeleted,
      userId: eventComments.userId,
      name: users.name,
      avatarUrl: users.avatarUrl,
    })
    .from(eventComments)
    .leftJoin(users, eq(eventComments.userId, users.id))
    .where(and(eq(eventComments.eventId, eventId), eq(eventComments.isDeleted, false)))
    .orderBy(asc(eventComments.createdAt));
  return NextResponse.json({ comments: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    if (!rateLimit(clientKey(req, `comment-${user.id}`), 15, 5 * 60 * 1000)) throw new Error("留言太頻繁，請稍後再試");

    const body = await req.json().catch(() => null);
    const content = sanitize(String(body?.content || ""), 1000);
    if (!content) throw new Error("請輸入留言內容");
    if (looksLikeSpam(content)) throw new Error("內容疑似垃圾訊息，已被系統封鎖");

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");

    const [comment] = await db.insert(eventComments).values({ eventId, userId: user.id, content }).returning();

    if (event.hostId !== user.id) {
      await notify({
        userId: event.hostId,
        type: "event_comment",
        title: "活動有新留言",
        content: `${user.name}：${content.slice(0, 40)}`,
        link: `/events/${eventId}`,
      });
    }

    return NextResponse.json({ ok: true, comment: { ...comment, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    return errorResponse(err);
  }
}
