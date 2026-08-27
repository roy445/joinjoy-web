import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, events, eventParticipants, favorites } from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// Lightweight content-based recommendation: scores upcoming events by overlap with
// the user's interests / tags, favorite regions from history, and region match.
export async function GET() {
  const currentUser = await getCurrentUser();

  let upcoming: any[] = [];
  try {
    upcoming = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        region: events.region,
        tags: events.tags,
        hostName: users.name,
        hostRole: users.role,
        capacity: events.capacity,
        fee: events.fee,
        meetingLocation: events.meetingLocation,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .where(and(eq(events.isPrivate, false), ne(events.status, "cancelled"), ne(events.status, "completed")))
      .limit(60);
    
    upcoming = upcoming.map(e => ({
      ...e,
      hostTitle: null,
      hostBadge: null,
    }));
  } catch (error) {
    console.error("Recommendations fetch error, falling back to basic fields:", error);
    const fallback = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        region: events.region,
        tags: events.tags,
        hostName: users.name,
        hostRole: users.role,
        capacity: events.capacity,
        fee: events.fee,
        meetingLocation: events.meetingLocation,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .where(and(eq(events.isPrivate, false), ne(events.status, "cancelled"), ne(events.status, "completed")))
      .limit(60);
    
    upcoming = fallback.map(e => ({
      ...e,
      hostTitle: null,
      hostBadge: null,
    }));
  }

  if (!currentUser) {
    return NextResponse.json({ events: upcoming.slice(0, 8), reason: "熱門活動推薦" });
  }

  const [profile] = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
  const interests = new Set((profile?.interests as string[]) || []);

  const history = await db
    .select({ tags: events.tags, region: events.region })
    .from(eventParticipants)
    .innerJoin(events, eq(eventParticipants.eventId, events.id))
    .where(eq(eventParticipants.userId, currentUser.id));

  const favTags = await db
    .select({ tags: events.tags })
    .from(favorites)
    .innerJoin(events, eq(favorites.eventId, events.id))
    .where(eq(favorites.userId, currentUser.id));

  const tagFreq = new Map<string, number>();
  [...history, ...favTags].forEach((h) => {
    ((h.tags as string[]) || []).forEach((tag) => tagFreq.set(tag, (tagFreq.get(tag) || 0) + 1));
  });
  const regionFreq = new Map<string, number>();
  history.forEach((h) => {
    if (h.region) regionFreq.set(h.region, (regionFreq.get(h.region) || 0) + 1);
  });

  const scored = upcoming.map((e) => {
    let score = 0;
    const eventTags = (e.tags as string[]) || [];
    eventTags.forEach((tag) => {
      if (tagFreq.has(tag)) score += 3 * (tagFreq.get(tag) || 1);
      if (interests.has(tag)) score += 2;
    });
    if (e.region && regionFreq.has(e.region)) score += 2;
    score += Math.random(); // small tie-breaker for variety
    return { ...e, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const hasSignal = scored.some((s) => s.score > 1);

  return NextResponse.json({
    events: scored.slice(0, 8),
    reason: hasSignal ? "根據你的興趣與活動紀錄推薦" : "熱門活動推薦",
  });
}
