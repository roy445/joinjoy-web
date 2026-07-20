import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, events, eventParticipants } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET() {
  const topHosts = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, creditScore: users.creditScore, count: sql<number>`count(${events.id})` })
    .from(users)
    .innerJoin(events, eq(events.hostId, users.id))
    .groupBy(users.id)
    .orderBy(desc(sql`count(${events.id})`))
    .limit(10);

  const topActive = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, creditScore: users.creditScore, count: sql<number>`count(${eventParticipants.id})` })
    .from(users)
    .innerJoin(eventParticipants, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.status, "approved"))
    .groupBy(users.id)
    .orderBy(desc(sql`count(${eventParticipants.id})`))
    .limit(10);

  const topCredit = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, creditScore: users.creditScore })
    .from(users)
    .where(eq(users.isBlacklisted, false))
    .orderBy(desc(users.creditScore))
    .limit(10);

  const popularEvents = await db
    .select({
      id: events.id,
      title: events.title,
      coverImageUrl: events.coverImageUrl,
      hostName: users.name,
      count: sql<number>`count(${eventParticipants.id})`,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .innerJoin(eventParticipants, eq(eventParticipants.eventId, events.id))
    .where(eq(eventParticipants.status, "approved"))
    .groupBy(events.id, users.name)
    .orderBy(desc(sql`count(${eventParticipants.id})`))
    .limit(10);

  return NextResponse.json({ topHosts, topActive, topCredit, popularEvents });
}
