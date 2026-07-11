import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, eventParticipants, events, favorites, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const [event] = await db.select({ event: events, hostName: users.name, hostEmail: users.email, hostAvatarUrl: users.avatarUrl, hostCreditScore: users.creditScore }).from(events).innerJoin(users, eq(events.hostId, users.id)).where(eq(events.id, eventId)).limit(1);
    if (!event) return NextResponse.json({ message: "找不到活動" }, { status: 404 });

    const currentUser = await getCurrentUser();
    if (event.event.visibility === "private" && event.event.hostId !== currentUser?.id) {
      const [membership] = currentUser ? await db.select({ id: eventParticipants.id }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, currentUser.id), eq(eventParticipants.status, "joined"))).limit(1) : [];
      if (!membership) return NextResponse.json({ message: "這是私人活動" }, { status: 403 });
    }

    const participants = await db.select({ id: eventParticipants.id, userId: eventParticipants.userId, name: users.name, avatarUrl: users.avatarUrl, status: eventParticipants.status, joinedAt: eventParticipants.joinedAt }).from(eventParticipants).innerJoin(users, eq(eventParticipants.userId, users.id)).where(eq(eventParticipants.eventId, eventId));
    const favorite = currentUser ? await db.select({ id: favorites.id }).from(favorites).where(and(eq(favorites.eventId, eventId), eq(favorites.userId, currentUser.id))).limit(1) : [];
    return NextResponse.json({ event: { ...event.event, host: { id: event.event.hostId, name: event.hostName, email: event.hostEmail, avatarUrl: event.hostAvatarUrl, creditScore: event.hostCreditScore }, participants, attendeeCount: participants.filter((participant) => participant.status === "joined").length, isFavorite: favorite.length > 0 } });
  } catch {
    return NextResponse.json({ message: "目前無法取得活動詳情" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const [event] = await db.select({ hostId: events.hostId }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    if (event.hostId !== user.id && user.role !== "admin") return NextResponse.json({ message: "沒有管理活動的權限" }, { status: 403 });
    const body = (await request.json()) as { title?: unknown; description?: unknown; status?: unknown; capacity?: unknown; notes?: unknown };
    const updates: Partial<typeof events.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.title === "string" && body.title.trim().length >= 4) updates.title = body.title.trim();
    if (typeof body.description === "string" && body.description.trim().length >= 20) updates.description = body.description.trim();
    if (body.status === "active" || body.status === "cancelled" || body.status === "completed") updates.status = body.status;
    if (typeof body.capacity === "number" && body.capacity >= 2) updates.capacity = Math.floor(body.capacity);
    if (typeof body.notes === "string") updates.notes = body.notes.trim();
    const [updated] = await db.update(events).set(updates).where(eq(events.id, eventId)).returning({ id: events.id, title: events.title, status: events.status });
    await db.insert(auditLogs).values({ actorId: user.id, action: "event_updated", entityType: "event", entityId: eventId, metadata: { fields: Object.keys(updates) } });
    return NextResponse.json({ event: updated });
  } catch {
    return NextResponse.json({ message: "更新活動失敗" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const [event] = await db.select({ hostId: events.hostId }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    if (event.hostId !== user.id && user.role !== "admin") return NextResponse.json({ message: "沒有刪除活動的權限" }, { status: 403 });
    await db.delete(events).where(eq(events.id, eventId));
    await db.insert(auditLogs).values({ actorId: user.id, action: "event_deleted", entityType: "event", entityId: eventId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "刪除活動失敗" }, { status: 500 });
  }
}
