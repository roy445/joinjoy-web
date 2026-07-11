import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events, reviews, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

function score(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

export async function GET(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const result = await db.select({ id: reviews.id, punctuality: reviews.punctuality, friendliness: reviews.friendliness, noShow: reviews.noShow, overall: reviews.overall, comment: reviews.comment, createdAt: reviews.createdAt, reviewerId: users.id, reviewerName: users.name }).from(reviews).innerJoin(users, eq(reviews.reviewerId, users.id)).where(eq(reviews.eventId, eventId));
    return NextResponse.json({ reviews: result });
  } catch {
    return NextResponse.json({ message: "目前無法取得評價" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const [event] = await db.select({ hostId: events.hostId, endAt: events.endAt }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event || event.endAt > new Date()) return NextResponse.json({ message: "活動結束後才能評價" }, { status: 400 });
    const body = (await request.json()) as { revieweeId?: unknown; punctuality?: unknown; friendliness?: unknown; noShow?: unknown; overall?: unknown; comment?: unknown };
    const revieweeId = typeof body.revieweeId === "string" ? body.revieweeId : event.hostId;
    const [participant] = await db.select({ id: eventParticipants.id }).from(eventParticipants).where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id), eq(eventParticipants.status, "joined"))).limit(1);
    if (!participant && user.id !== event.hostId) return NextResponse.json({ message: "只有活動參與者可以評價" }, { status: 403 });
    const punctuality = score(body.punctuality); const friendliness = score(body.friendliness); const overall = score(body.overall);
    if (!punctuality || !friendliness || !overall) return NextResponse.json({ message: "請完成評分" }, { status: 400 });
    const [review] = await db.insert(reviews).values({ eventId, reviewerId: user.id, revieweeId, punctuality, friendliness, noShow: body.noShow === true, overall, comment: typeof body.comment === "string" ? body.comment.trim() : null }).returning({ id: reviews.id });
    const increment = Math.round(((overall - 3) * 2));
    await db.update(users).set({ creditScore: Math.max(0, Math.min(200, user.creditScore + increment)), updatedAt: new Date() }).where(eq(users.id, revieweeId));
    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return NextResponse.json({ message: "你已經評價過這位參與者" }, { status: 409 });
    return NextResponse.json({ message: "評價送出失敗" }, { status: 500 });
  }
}
