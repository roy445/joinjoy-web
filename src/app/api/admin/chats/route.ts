import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventChatMessages, events } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const eventId = req.nextUrl.searchParams.get("eventId");

    if (eventId) {
      const rows = await db.select().from(eventChatMessages).where(eq(eventChatMessages.eventId, Number(eventId))).orderBy(desc(eventChatMessages.createdAt)).limit(100);
      return NextResponse.json({ messages: rows });
    }

    const rooms = await db
      .select({
        eventId: events.id,
        title: events.title,
        messageCount: sql<number>`count(${eventChatMessages.id})`,
        lastMessageAt: sql<string>`max(${eventChatMessages.createdAt})`,
      })
      .from(events)
      .leftJoin(eventChatMessages, eq(eventChatMessages.eventId, events.id))
      .groupBy(events.id)
      .orderBy(desc(sql`max(${eventChatMessages.createdAt})`));

    return NextResponse.json({ rooms });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("messageId"));
    if (!id) throw new Error("缺少訊息 ID");
    await db.update(eventChatMessages).set({ isDeleted: true }).where(eq(eventChatMessages.id, id));
    await logAdminAction(admin.id, "刪除聊天室訊息", "chat_message", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
