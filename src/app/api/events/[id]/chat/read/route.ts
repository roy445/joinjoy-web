import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventChatReads } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    const [existing] = await db
      .select()
      .from(eventChatReads)
      .where(and(eq(eventChatReads.eventId, eventId), eq(eventChatReads.userId, user.id)))
      .limit(1);
    if (existing) {
      await db.update(eventChatReads).set({ lastReadAt: new Date() }).where(eq(eventChatReads.id, existing.id));
    } else {
      await db.insert(eventChatReads).values({ eventId, userId: user.id });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
