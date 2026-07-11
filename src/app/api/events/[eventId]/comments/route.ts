import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, events, notifications, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const result = await db.select({ id: comments.id, content: comments.content, createdAt: comments.createdAt, userId: users.id, userName: users.name, avatarUrl: users.avatarUrl }).from(comments).innerJoin(users, eq(comments.userId, users.id)).where(eq(comments.eventId, eventId)).orderBy(asc(comments.createdAt));
    return NextResponse.json({ comments: result });
  } catch {
    return NextResponse.json({ message: "目前無法取得留言" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入才能留言" }, { status: 401 });
    const body = (await request.json()) as { content?: unknown };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (content.length < 1 || content.length > 2000) return NextResponse.json({ message: "留言需為 1–2000 個字元" }, { status: 400 });
    const [event] = await db.select({ hostId: events.hostId, title: events.title }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    const [comment] = await db.insert(comments).values({ eventId, userId: user.id, content }).returning({ id: comments.id, content: comments.content, createdAt: comments.createdAt });
    if (event.hostId !== user.id) await db.insert(notifications).values({ userId: event.hostId, type: "event_comment", title: "活動有新留言", body: `${user.name} 在「${event.title}」留下了留言`, link: `/events/${eventId}` });
    return NextResponse.json({ comment }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "留言失敗" }, { status: 500 });
  }
}
