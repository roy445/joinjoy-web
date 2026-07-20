import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventChatMessages, users, events, eventParticipants } from "@/db/schema";
import { eq, and, asc, gt, or } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, looksLikeSpam, rateLimit, clientKey, isSameOrigin } from "@/lib/security";

async function assertMember(eventId: number, userId: number) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) throw new Error("找不到活動");
  if (event.hostId === userId) return event;
  const [p] = await db
    .select()
    .from(eventParticipants)
    .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId), eq(eventParticipants.status, "approved")))
    .limit(1);
  if (!p) throw new Error("僅活動成員可使用聊天室");
  return event;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    await assertMember(eventId, user.id);

    const sinceId = Number(req.nextUrl.searchParams.get("sinceId") || 0);

    const rows = await db
      .select({
        id: eventChatMessages.id,
        type: eventChatMessages.type,
        content: eventChatMessages.content,
        imageUrl: eventChatMessages.imageUrl,
        mentions: eventChatMessages.mentions,
        pollId: eventChatMessages.pollId,
        createdAt: eventChatMessages.createdAt,
        userId: eventChatMessages.userId,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(eventChatMessages)
      .leftJoin(users, eq(eventChatMessages.userId, users.id))
      .where(and(eq(eventChatMessages.eventId, eventId), eq(eventChatMessages.isDeleted, false), sinceId ? gt(eventChatMessages.id, sinceId) : undefined))
      .orderBy(asc(eventChatMessages.id))
      .limit(200);

    return NextResponse.json({ messages: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    if (!rateLimit(clientKey(req, `chat-${user.id}`), 30, 5 * 60 * 1000)) throw new Error("發送太頻繁，請放慢速度");
    const event = await assertMember(eventId, user.id);

    const body = await req.json().catch(() => null);
    const type = body?.type === "image" ? "image" : "text";
    let content = "";
    let imageUrl: string | null = null;
    if (type === "image") {
      imageUrl = String(body?.imageUrl || "");
      if (!imageUrl) throw new Error("圖片網址遺失");
    } else {
      content = sanitize(String(body?.content || ""), 1000);
      if (!content) throw new Error("請輸入訊息內容");
      if (looksLikeSpam(content)) throw new Error("內容疑似垃圾訊息，已被系統封鎖");
    }

    // parse @mentions by name
    const members = await db
      .select({ userId: eventParticipants.userId, name: users.name })
      .from(eventParticipants)
      .leftJoin(users, eq(eventParticipants.userId, users.id))
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "approved")));
    const mentions: number[] = [];
    if (content) {
      for (const m of members) {
        if (m.name && content.includes(`@${m.name}`) && m.userId !== user.id) mentions.push(m.userId);
      }
    }

    const [msg] = await db
      .insert(eventChatMessages)
      .values({ eventId, userId: user.id, type, content, imageUrl, mentions })
      .returning();

    if (mentions.length) {
      await notifyMany(mentions, {
        type: "chat_mention",
        title: "有人在聊天室提及你",
        content: `${user.name} 在「${event.title}」聊天室提到你`,
        link: `/events/${eventId}?tab=chat`,
      });
    }

    return NextResponse.json({ ok: true, message: { ...msg, name: user.name, avatarUrl: user.avatarUrl } });
  } catch (err) {
    return errorResponse(err);
  }
}
