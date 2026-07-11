import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入才能報名" }, { status: 401 });
    const [event] = await db.select({ hostId: events.hostId, title: events.title, capacity: events.capacity, allowWaitlist: events.allowWaitlist, requiresApproval: events.requiresApproval, status: events.status }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event || event.status !== "active") return NextResponse.json({ message: "活動不存在或已結束" }, { status: 404 });
    const [existing] = await db.select({ id: eventParticipants.id, status: eventParticipants.status }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id))).limit(1);
    if (existing?.status === "joined" || existing?.status === "pending" || existing?.status === "waitlisted") return NextResponse.json({ message: "你已經報名過這場活動" }, { status: 409 });
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "joined")));
    const isFull = count >= event.capacity;
    if (isFull && !event.allowWaitlist) return NextResponse.json({ message: "活動名額已滿，且未開放候補" }, { status: 409 });
    const status = isFull ? "waitlisted" : event.requiresApproval ? "pending" : "joined";
    if (existing) await db.update(eventParticipants).set({ status, joinedAt: new Date() }).where(eq(eventParticipants.id, existing.id));
    else await db.insert(eventParticipants).values({ eventId, userId: user.id, status });
    await db.insert(notifications).values({ userId: event.hostId, type: "event_join", title: "活動有新的報名", body: `${user.name} ${status === "waitlisted" ? "加入了候補名單" : "報名了「${event.title}」"}`, link: `/events/${eventId}` });
    return NextResponse.json({ status, message: status === "waitlisted" ? "已加入候補名單" : status === "pending" ? "已送出報名申請" : "報名成功" });
  } catch {
    return NextResponse.json({ message: "報名失敗，請稍後再試" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const [updated] = await db.update(eventParticipants).set({ status: "left" }).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id))).returning({ id: eventParticipants.id });
    if (!updated) return NextResponse.json({ message: "你尚未報名這場活動" }, { status: 404 });
    return NextResponse.json({ ok: true, message: "已退出活動" });
  } catch {
    return NextResponse.json({ message: "退出活動失敗" }, { status: 500 });
  }
}
