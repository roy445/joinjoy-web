import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventPolls, eventPollVotes, events, eventChatMessages } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { eventParticipants, users } from "@/db/schema";
import { sanitize, isSameOrigin } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    const polls = await db.select().from(eventPolls).where(eq(eventPolls.eventId, eventId)).orderBy(desc(eventPolls.createdAt));
    const votes = await db.select().from(eventPollVotes).where(eq(eventPollVotes.pollId, polls[0]?.id ?? -1));

    const results = await Promise.all(
      polls.map(async (poll) => {
        const pollVotes = await db.select().from(eventPollVotes).where(eq(eventPollVotes.pollId, poll.id));
        const counts = (poll.options as string[]).map((_, i) => pollVotes.filter((v) => v.optionIndex === i).length);
        const myVote = pollVotes.find((v) => v.userId === user.id)?.optionIndex ?? null;
        return { ...poll, counts, totalVotes: pollVotes.length, myVote };
      })
    );

    return NextResponse.json({ polls: results });
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
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");
    if (event.hostId !== user.id && user.role !== "admin") throw new Error("僅揪主可發起投票");

    const body = await req.json().catch(() => null);
    const question = sanitize(String(body?.question || ""), 200);
    const options = (Array.isArray(body?.options) ? body.options : []).map((o: string) => sanitize(o, 100)).filter(Boolean);
    if (!question) throw new Error("請輸入投票問題");
    if (options.length < 2) throw new Error("請至少提供 2 個選項");

    const [poll] = await db.insert(eventPolls).values({ eventId, createdBy: user.id, question, options }).returning();
    await db.insert(eventChatMessages).values({ eventId, userId: user.id, type: "poll", content: question, pollId: poll.id });

    const members = await db
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "approved")));
    await notifyMany(members.map((m) => m.userId).filter((id) => id !== user.id), {
      type: "event_poll",
      title: "活動發起新投票",
      content: question,
      link: `/events/${eventId}?tab=chat`,
    });

    return NextResponse.json({ ok: true, poll });
  } catch (err) {
    return errorResponse(err);
  }
}
