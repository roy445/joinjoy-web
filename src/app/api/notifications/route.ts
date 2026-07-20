import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (req.nextUrl.searchParams.get("unreadCount")) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));
      return NextResponse.json({ count: Number(count) });
    }
    const rows = await db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(100);
    return NextResponse.json({ notifications: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (body.markAllRead) {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
      return NextResponse.json({ ok: true });
    }
    if (body.id) {
      await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, Number(body.id)), eq(notifications.userId, user.id)));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  } catch (err) {
    return errorResponse(err);
  }
}
