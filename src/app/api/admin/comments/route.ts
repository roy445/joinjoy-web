import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventComments, users, events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: eventComments.id,
        content: eventComments.content,
        createdAt: eventComments.createdAt,
        isDeleted: eventComments.isDeleted,
        userName: users.name,
        eventId: events.id,
        eventTitle: events.title,
      })
      .from(eventComments)
      .leftJoin(users, eq(eventComments.userId, users.id))
      .leftJoin(events, eq(eventComments.eventId, events.id))
      .orderBy(desc(eventComments.createdAt))
      .limit(200);
    return NextResponse.json({ comments: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) throw new Error("缺少 ID");
    await db.update(eventComments).set({ isDeleted: true }).where(eq(eventComments.id, id));
    await logAdminAction(admin.id, "刪除留言", "comment", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
