import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users, eventParticipants, groups, groupMembers } from "@/db/schema";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { autoUpdateEventStatuses } from "@/lib/event-status";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const groupId = Number(idStr);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) throw new Error("找不到社團");

    const currentUser = await getCurrentUser();
    const isOwner = currentUser?.id === group.ownerId;
    const isAdmin = currentUser?.role === "admin";
    let isApprovedMember = isOwner || isAdmin;
    if (!isApprovedMember && currentUser) {
      const [m] = await db
        .select({ status: groupMembers.status })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, currentUser.id)))
        .limit(1);
      isApprovedMember = m?.status === "approved";
    }
    if (!isApprovedMember) throw new Error("僅社團成員可查看此社團的活動");

    await autoUpdateEventStatuses();

    const participantCountSub = db
      .select({ eventId: eventParticipants.eventId, count: sql<number>`count(*)`.as("count") })
      .from(eventParticipants)
      .where(eq(eventParticipants.status, "approved"))
      .groupBy(eventParticipants.eventId)
      .as("pc");

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        meetingLocation: events.meetingLocation,
        region: events.region,
        capacity: events.capacity,
        fee: events.fee,
        status: events.status,
        tags: events.tags,
        hostName: users.name,
        hostAvatar: users.avatarUrl,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
      .where(and(eq(events.groupId, groupId), ne(events.status, "cancelled")))
      .orderBy(desc(events.createdAt));

    return NextResponse.json({ events: rows.map((r) => ({ ...r, remaining: Math.max(0, r.capacity - Number(r.participantCount)) })) });
  } catch (err) {
    return errorResponse(err);
  }
}