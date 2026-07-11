import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { chatMessages, eventParticipants, events, notifications, users } from "@/db/schema";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

async function canAccess(eventId: string, userId: string) {
  const [event] = await db.select({ hostId: events.hostId }).from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) return { exists: false, allowed: false, hostId: null as string | null };
  if (event.hostId === userId) return { exists: true, allowed: true, hostId: event.hostId };
  const [participant] = await db.select({ id: eventParticipants.id }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, userId), eq(eventParticipants.status, "joined"))).limit(1);
  return { exists: true, allowed: Boolean(participant), hostId: event.hostId };
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const access = await canAccess(eventId, user.id);
    if (!access.exists) return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    if (!access.allowed) return NextResponse.json({ message: "只有活動成員可以進入聊天室" }, { status: 403 });
    const messages = await db.select({ id: chatMessages.id, content: chatMessages.content, imageUrl: chatMessages.imageUrl, isAnnouncement: chatMessages.isAnnouncement, mentions: chatMessages.mentions, createdAt: chatMessages.createdAt, userId: users.id, userName: users.name, avatarUrl: users.avatarUrl }).from(chatMessages).innerJoin(users, eq(chatMessages.userId, users.id)).where(eq(chatMessages.eventId, eventId)).orderBy(asc(chatMessages.createdAt));
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ message: "目前無法取得聊天室訊息" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const access = await canAccess(eventId, user.id);
    if (!access.allowed) return NextResponse.json({ message: "只有活動成員可以發送訊息" }, { status: 403 });
    const body = (await request.json()) as { content?: unknown; imageUrl?: unknown; mentions?: unknown };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content && typeof body.imageUrl !== "string") return NextResponse.json({ message: "訊息不能是空白" }, { status: 400 });
    if (content.length > 4000) return NextResponse.json({ message: "訊息太長" }, { status: 400 });
    const mentions = Array.isArray(body.mentions) ? body.mentions.filter((mention): mention is string => typeof mention === "string").slice(0, 20) : [];
    const [message] = await db.insert(chatMessages).values({ eventId, userId: user.id, content, imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null, mentions }).returning({ id: chatMessages.id, content: chatMessages.content, createdAt: chatMessages.createdAt });
    if (access.hostId && access.hostId !== user.id) await db.insert(notifications).values({ userId: access.hostId, type: "chat_message", title: "聊天室有新訊息", body: `${user.name} 在活動聊天室發送了新訊息`, link: `/events/${eventId}` });
    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "訊息發送失敗" }, { status: 500 });
  }
}
