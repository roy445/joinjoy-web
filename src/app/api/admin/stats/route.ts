import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, events, eventParticipants, sessions, reports, blacklistRequests, createEventRequests, accountAppeals } from "@/db/schema";
import { sql, gte, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [eventCount] = await db.select({ count: sql<number>`count(*)` }).from(events);
    const [suspendedCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.status, "suspended"));
    const [blacklistedCount] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isBlacklisted, true));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [activeToday] = await db
      .select({ count: sql<number>`count(distinct ${sessions.userId})` })
      .from(sessions)
      .where(gte(sessions.createdAt, todayStart));

    const [pendingReports] = await db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, "pending"));
    const [pendingBlacklist] = await db.select({ count: sql<number>`count(*)` }).from(blacklistRequests).where(eq(blacklistRequests.status, "pending"));
    const [pendingRequests] = await db.select({ count: sql<number>`count(*)` }).from(createEventRequests).where(eq(createEventRequests.status, "pending"));
    const [pendingAppeals] = await db.select({ count: sql<number>`count(*)` }).from(accountAppeals).where(eq(accountAppeals.status, "pending"));

    const regionStats = await db
      .select({ name: events.region, count: sql<number>`count(*)` })
      .from(events)
      .groupBy(events.region)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const statusStats = await db
      .select({ status: events.status, count: sql<number>`count(*)` })
      .from(events)
      .groupBy(events.status);

    const dailySignups = await db
      .select({ day: sql<string>`to_char(${users.createdAt}, 'MM/DD')`, count: sql<number>`count(*)` })
      .from(users)
      .groupBy(sql`to_char(${users.createdAt}, 'MM/DD')`)
      .orderBy(sql`to_char(${users.createdAt}, 'MM/DD')`)
      .limit(14);

    return NextResponse.json({
      userCount: Number(userCount?.count ?? 0),
      eventCount: Number(eventCount?.count ?? 0),
      suspendedCount: Number(suspendedCount?.count ?? 0),
      blacklistedCount: Number(blacklistedCount?.count ?? 0),
      activeToday: Number(activeToday?.count ?? 0),
      pendingReports: Number(pendingReports?.count ?? 0),
      pendingBlacklist: Number(pendingBlacklist?.count ?? 0),
      pendingRequests: Number(pendingRequests?.count ?? 0),
      pendingAppeals: Number(pendingAppeals?.count ?? 0),
      regionStats,
      statusStats,
      dailySignups,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
