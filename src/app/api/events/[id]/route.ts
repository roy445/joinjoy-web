import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users, eventParticipants, favorites, groups, groupMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify, notifyMany } from "@/lib/notify";
import { sanitize, isSameOrigin } from "@/lib/security";
import { autoUpdateEventStatuses } from "@/lib/event-status";

async function loadEvent(id: number) {
  const [event] = await db
	    .select({
	      event: events,
	      hostName: users.name,
	      hostAvatar: users.avatarUrl,
	      hostBio: users.bio,
	      hostCredit: users.creditScore,
	      hostRole: users.role,
	      hostTitle: users.activeTitle,
	      hostBadge: users.activeBadge,
	      hostJCoins: users.jCoins,
	      groupName: groups.name,
	    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(eq(events.id, id))
    .limit(1);
  return event;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "找不到活動" }, { status: 404 });

  await autoUpdateEventStatuses();

  const record = await loadEvent(id);
  if (!record) return NextResponse.json({ error: "找不到活動" }, { status: 404 });

  await db.update(events).set({ viewCount: sql`${events.viewCount} + 1` }).where(eq(events.id, id));

  const currentUser = await getCurrentUser();

  // If this event is scoped to a private group, only approved group members
  // (or the host / a platform admin) may view its details.
  if (record.event.groupId) {
    const isHost = currentUser?.id === record.event.hostId;
    const isAdminUser = currentUser?.role === "admin";
    if (!isHost && !isAdminUser) {
      if (!currentUser) return NextResponse.json({ error: "此活動僅限社團成員查看，請先登入" }, { status: 403 });
      const [membership] = await db
        .select({ status: groupMembers.status })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, record.event.groupId), eq(groupMembers.userId, currentUser.id)))
        .limit(1);
      if (!membership || membership.status !== "approved") {
        return NextResponse.json({ error: "此活動僅限社團成員查看" }, { status: 403 });
      }
    }
  }

  const participants = await db
	    .select({
	      id: eventParticipants.id,
	      userId: eventParticipants.userId,
	      status: eventParticipants.status,
	      plusOneCount: eventParticipants.plusOneCount,
	      joinedAt: eventParticipants.joinedAt,
	      name: users.name,
	      avatarUrl: users.avatarUrl,
	      creditScore: users.creditScore,
	      isBlacklisted: users.isBlacklisted,
	      role: users.role,
	      activeTitle: users.activeTitle,
	      activeBadge: users.activeBadge,
	      jCoins: users.jCoins,
	    })
    .from(eventParticipants)
    .leftJoin(users, eq(eventParticipants.userId, users.id))
    .where(eq(eventParticipants.eventId, id));

  const approved = participants.filter((p) => p.status === "approved");
  const waitlist = participants.filter((p) => p.status === "waitlist");
  const pending = participants.filter((p) => p.status === "pending");

  const hostEventsCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(events)
    .where(eq(events.hostId, record.event.hostId));

  let myParticipation = null;
  let isFavorited = false;
  if (currentUser) {
    myParticipation = participants.find((p) => p.userId === currentUser.id) ?? null;
    const fav = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, currentUser.id), eq(favorites.eventId, id)))
      .limit(1);
    isFavorited = fav.length > 0;
  }

  return NextResponse.json({
    event: record.event,
    group: record.event.groupId ? { id: record.event.groupId, name: record.groupName } : null,
	    host: {
	      id: record.event.hostId,
	      name: record.hostName,
	      avatarUrl: record.hostAvatar,
	      bio: record.hostBio,
	      creditScore: record.hostCredit,
	      role: record.hostRole,
	      activeTitle: record.hostTitle,
	      activeBadge: record.hostBadge,
	      jCoins: record.hostJCoins,
	      eventsHosted: hostEventsCount[0]?.count ?? 0,
	    },
    participants: approved,
    waitlist,
    pending: currentUser && (currentUser.id === record.event.hostId || currentUser.role === "admin") ? pending : [],
    remaining: Math.max(0, record.event.capacity - approved.length),
    myParticipation,
    isFavorited,
    isOwner: currentUser?.id === record.event.hostId,
    isAdmin: currentUser?.role === "admin",
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const record = await loadEvent(id);
    if (!record) throw new Error("找不到活動");
    const isOwner = record.event.hostId === user.id;
    if (!isOwner && user.role !== "admin") throw new Error("沒有權限修改此活動");

    const body = await req.json().catch(() => null);
    if (!body) throw new Error("格式錯誤");

    const wasCancelled = body.status === "cancelled" && record.event.status !== "cancelled";

    // Only a platform admin stepping in to moderate *someone else's* event
    // bypasses the 24-hour lock. If the admin is also the host testing their
    // own event, the same restriction applies to them as any other host.
    const isAdminOverride = user.role === "admin" && !isOwner;

    // Lock non-cancellation edits within 24 hours of the event's start time,
    // to protect participants who already committed to the plan. Cancelling
    // (with a required reason) remains allowed even inside this window.
    if (!isAdminOverride && !wasCancelled) {
      const startAt = new Date(`${record.event.eventDate}T${record.event.startTime}:00`);
      const hoursUntilStart = (startAt.getTime() - Date.now()) / (1000 * 60 * 60);
      const attemptingContentEdit = Object.keys(body).some((k) => k !== "status");
      if (attemptingContentEdit && hoursUntilStart < 24) {
        throw new Error("活動即將於 24 小時內開始（或已經開始），已無法修改活動資訊。如需異動請使用「取消活動」功能並說明原因");
      }
    }

    if (wasCancelled) {
      const reason = sanitize(String(body.cancelReason || ""), 500);
      if (!reason || reason.length < 5) throw new Error("請填寫取消活動的原因（至少 5 個字）");
    }

    // If changing the event's group scope, verify the requester is an
    // approved member (or owner) of the target group.
    if ("groupId" in body && body.groupId) {
      const [membership] = await db
        .select({ status: groupMembers.status, role: groupMembers.role })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, Number(body.groupId)), eq(groupMembers.userId, user.id)))
        .limit(1);
      if (!membership || membership.status !== "approved") {
        throw new Error("您不是該社團的成員，無法將活動設定給此社團");
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const allowedFields = [
      "title", "description", "coverImageUrl", "images", "eventDate", "startTime", "endTime",
      "meetingLocation", "mapAddress", "lat", "lng", "capacity", "fee", "contactInfo", "notes",
      "requireApproval", "allowWaitlist", "ageMin", "ageMax", "genderLimit", "allowPlusOne",
      "isPrivate", "tags", "status", "region", "cancelReason", "groupId",
    ];
    for (const field of allowedFields) {
      if (field in body) updates[field] = body[field];
    }
    if (typeof updates.title === "string") updates.title = sanitize(updates.title, 150);
    if (typeof updates.description === "string") updates.description = sanitize(updates.description, 5000);
    if (typeof updates.cancelReason === "string") updates.cancelReason = sanitize(updates.cancelReason, 500);
    if ("groupId" in updates && !updates.groupId) updates.groupId = null;

    const dateChanged = (body.eventDate && body.eventDate !== record.event.eventDate) || (body.startTime && body.startTime !== record.event.startTime);

    await db.update(events).set(updates).where(eq(events.id, id));

    if (wasCancelled || dateChanged) {
      const participants = await db.select({ userId: eventParticipants.userId }).from(eventParticipants).where(and(eq(eventParticipants.eventId, id), eq(eventParticipants.status, "approved")));
      const cancelReason = typeof updates.cancelReason === "string" ? updates.cancelReason : "";
      await notifyMany(participants.map((p) => p.userId).filter((uid) => uid !== user.id), {
        type: wasCancelled ? "event_cancelled" : "event_time_changed",
        title: wasCancelled ? "活動已取消" : "活動時間異動",
        content: wasCancelled
          ? `「${record.event.title}」已被主辦人取消。取消原因：${cancelReason}`
          : `「${record.event.title}」的時間已異動，請留意最新資訊`,
        link: `/events/${id}`,
      });
    }

    if (user.role === "admin" && !isOwner) {
      await logAdminAction(user.id, "編輯活動", "event", id, JSON.stringify(body));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const record = await loadEvent(id);
    if (!record) throw new Error("找不到活動");
    if (record.event.hostId !== user.id && user.role !== "admin") throw new Error("沒有權限刪除此活動");

    const participants = await db.select({ userId: eventParticipants.userId }).from(eventParticipants).where(and(eq(eventParticipants.eventId, id), eq(eventParticipants.status, "approved")));
    await db.delete(events).where(eq(events.id, id));

    await notifyMany(participants.map((p) => p.userId).filter((uid) => uid !== user.id), {
      type: "event_deleted",
      title: "活動已被刪除",
      content: `「${record.event.title}」已被移除`,
    });

    if (user.role === "admin" && record.event.hostId !== user.id) {
      await logAdminAction(user.id, "刪除活動", "event", id, record.event.title);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}