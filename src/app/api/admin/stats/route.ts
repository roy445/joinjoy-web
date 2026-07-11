import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, eventParticipants, events, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const [[memberCount], [eventCount], [joinedCount], [logCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(events),
      db.select({ count: sql<number>`count(*)::int` }).from(eventParticipants),
      db.select({ count: sql<number>`count(*)::int` }).from(auditLogs),
    ]);
    const popularCategories = await db.select({ category: events.category, count: sql<number>`count(*)::int` }).from(events).groupBy(events.category).orderBy(sql`count(*) desc`).limit(5);
    return NextResponse.json({ stats: { members: memberCount?.count ?? 0, events: eventCount?.count ?? 0, participants: joinedCount?.count ?? 0, auditLogs: logCount?.count ?? 0, popularCategories } });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
