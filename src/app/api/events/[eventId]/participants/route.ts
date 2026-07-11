import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events, notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const [event] = await db.select({ hostId: events.hostId, title: events.title }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event || event.hostId !== user.id) return NextResponse.json({ message: "只有主辦人可以審核報名" }, { status: 403 });
    const body = (await request.json()) as { participantId?: unknown; status?: unknown };
    if (typeof body.participantId !== "string" || !["joined", "left"].includes(String(body.status))) return NextResponse.json({ message: "審核資料不正確" }, { status: 400 });
    const [updated] = await db.update(eventParticipants).set({ status: body.status as "joined" | "left" }).where(and(eq(eventParticipants.id, body.participantId), eq(eventParticipants.eventId, eventId))).returning({ userId: eventParticipants.userId, status: eventParticipants.status });
    if (!updated) return NextResponse.json({ message: "找不到報名資料" }, { status: 404 });
    await db.insert(notifications).values({ userId: updated.userId, type: "join_review", title: updated.status === "joined" ? "報名審核通過" : "報名未通過", body: `你在「${event.title}」的報名狀態已更新`, link: `/events/${eventId}` });
    return NextResponse.json({ participant: updated });
  } catch {
    return NextResponse.json({ message: "報名審核失敗" }, { status: 500 });
  }
}
