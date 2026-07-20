import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventPollVotes, eventPolls } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; pollId: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { pollId: pollIdStr } = await params;
    const pollId = Number(pollIdStr);
    const [poll] = await db.select().from(eventPolls).where(eq(eventPolls.id, pollId)).limit(1);
    if (!poll) throw new Error("找不到投票");

    const body = await req.json().catch(() => null);
    const optionIndex = Number(body?.optionIndex);
    if (Number.isNaN(optionIndex) || optionIndex < 0 || optionIndex >= (poll.options as string[]).length) {
      throw new Error("選項無效");
    }

    const [existing] = await db.select().from(eventPollVotes).where(and(eq(eventPollVotes.pollId, pollId), eq(eventPollVotes.userId, user.id))).limit(1);
    if (existing) {
      await db.update(eventPollVotes).set({ optionIndex }).where(eq(eventPollVotes.id, existing.id));
    } else {
      await db.insert(eventPollVotes).values({ pollId, userId: user.id, optionIndex });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
