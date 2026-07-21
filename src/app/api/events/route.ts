import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, users, eventParticipants, favorites, groupMembers } from "@/db/schema";
import { and, eq, gte, lte, sql, desc, asc, ilike, or, ne, isNull } from "drizzle-orm";
import { requireUser, getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { sanitize, rateLimit, clientKey, isSameOrigin } from "@/lib/security";
import { autoUpdateEventStatuses } from "@/lib/event-status";

export async function GET(req: NextRequest) {
  await autoUpdateEventStatuses();

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim();
  const region = sp.get("region");
  const tag = sp.get("tag");
  const date = sp.get("date");
  const minCapacity = sp.get("minCapacity");
  const maxFee = sp.get("maxFee");
  const freeOnly = sp.get("freeOnly") === "1";
  const sort = sp.get("sort") || "latest"; // latest | popular | upcoming | soon
  const tab = sp.get("tab"); // hot | new | upcoming
  const mine = sp.get("mine");
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(sp.get("limit") || 12)));

  // Group-scoped events are only discoverable from within their group page,
  // never through the public listing/search/map.
  const conditions = [eq(events.isPrivate, false), isNull(events.groupId)];
  if (mine) conditions.length = 0; // handled separately below

  if (q) {
    conditions.push(
      or(
        ilike(events.title, `%${q}%`),
        ilike(events.description, `%${q}%`),
        ilike(events.meetingLocation, `%${q}%`)
      )!
    );
  }
  if (region) conditions.push(eq(events.region, region));
  if (tag) conditions.push(sql`${events.tags} @> ${JSON.stringify([tag])}::jsonb`);
  if (date) conditions.push(eq(events.eventDate, date));
  if (minCapacity) conditions.push(gte(events.capacity, Number(minCapacity)));
  if (freeOnly) conditions.push(eq(events.fee, "0"));
  else if (maxFee) conditions.push(lte(events.fee, maxFee));
  if (status) conditions.push(eq(events.status, status));
  else conditions.push(ne(events.status, "cancelled"));

  if (tab === "upcoming") conditions.push(eq(events.status, "upcoming"));

  const participantCountSub = db
    .select({ eventId: eventParticipants.eventId, count: sql<number>`count(*)`.as("count") })
    .from(eventParticipants)
    .where(eq(eventParticipants.status, "approved"))
    .groupBy(eventParticipants.eventId)
    .as("pc");

  let orderBy = desc(events.createdAt);
  if (sort === "popular" || tab === "hot") orderBy = desc(sql`coalesce(${participantCountSub.count}, 0)`);
  if (sort === "upcoming" || tab === "upcoming" || sort === "soon") orderBy = asc(events.eventDate);

  const baseQuery = db
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
      lat: events.lat,
      lng: events.lng,
      hostId: events.hostId,
      hostName: users.name,
      hostAvatar: users.avatarUrl,
      participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      createdAt: events.createdAt,
    })
    .from(events)
    .leftJoin(users, eq(events.hostId, users.id))
    .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset((page - 1) * limit);

  const rows = await baseQuery;

  return NextResponse.json({
    events: rows.map((r) => ({ ...r, remaining: Math.max(0, r.capacity - Number(r.participantCount)) })),
    page,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (user.isBlacklisted) throw new Error("您的帳號已被列入黑名單，無法建立活動");
    if (!rateLimit(clientKey(req, `create-event-${user.id}`), 10, 60 * 60 * 1000)) {
      throw new Error("建立活動太頻繁，請稍後再試");
    }

    const fullUser = await db.select().from(users).where(eq(users.id, user.id)).then((r) => r[0]);
    const hasPermission = user.role === "admin" || fullUser.canCreateEvent || fullUser.eventCreateCredits > 0;
    if (!hasPermission) {
      throw new Error("您尚未取得建立活動權限，請先輸入一次性代碼或申請管理員審核");
    }

    const body = await req.json().catch(() => null);
    if (!body) throw new Error("格式錯誤");

    const title = sanitize(String(body.title || ""), 150);
    const description = sanitize(String(body.description || ""), 5000);
    const meetingLocation = sanitize(String(body.meetingLocation || ""), 255);
    const contactInfo = sanitize(String(body.contactInfo || ""), 255);
    const coverImageUrl = String(body.coverImageUrl || "");
    const eventDate = String(body.eventDate || "");
    const startTime = String(body.startTime || "");

    if (!title || title.length < 2) throw new Error("請輸入活動名稱");
    if (!coverImageUrl) throw new Error("請上傳活動封面圖片");
    if (!description || description.length < 10) throw new Error("請輸入至少 10 個字的活動介紹");
    if (!eventDate) throw new Error("請選擇活動日期");
    if (!startTime) throw new Error("請選擇開始時間");
    if (!meetingLocation) throw new Error("請輸入集合地點");
    if (!contactInfo) throw new Error("請輸入聯絡方式");
    if (!body.capacity || Number(body.capacity) < 1) throw new Error("請輸入名額上限");

    const capacity = Math.max(1, Math.min(1000, Number(body.capacity)));

    // If publishing exclusively within a group, verify approved membership.
    let groupId: number | null = null;
    if (body.groupId) {
      const [membership] = await db
        .select({ status: groupMembers.status })
        .from(groupMembers)
        .where(and(eq(groupMembers.groupId, Number(body.groupId)), eq(groupMembers.userId, user.id)))
        .limit(1);
      if (!membership || membership.status !== "approved") {
        throw new Error("您不是該社團的成員，無法將活動發佈到此社團");
      }
      groupId = Number(body.groupId);
    }

    const [created] = await db
      .insert(events)
      .values({
        title,
        coverImageUrl,
        images: Array.isArray(body.images) ? body.images.slice(0, 9) : [],
        description,
        region: body.region ? String(body.region) : null,
        eventDate,
        startTime,
        endTime: body.endTime ? String(body.endTime) : null,
        meetingLocation,
        mapAddress: body.mapAddress ? sanitize(String(body.mapAddress), 500) : null,
        lat: body.lat ? String(body.lat) : null,
        lng: body.lng ? String(body.lng) : null,
        capacity,
        fee: String(Number(body.fee) || 0),
        contactInfo,
        notes: body.notes ? sanitize(String(body.notes), 2000) : null,
        requireApproval: !!body.requireApproval,
        allowWaitlist: body.allowWaitlist !== false,
        ageMin: body.ageMin ? Number(body.ageMin) : null,
        ageMax: body.ageMax ? Number(body.ageMax) : null,
        genderLimit: ["any", "male", "female"].includes(body.genderLimit) ? body.genderLimit : "any",
        allowPlusOne: !!body.allowPlusOne,
        isPrivate: groupId ? true : !!body.isPrivate,
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 8) : [],
        hostId: user.id,
        groupId,
      })
      .returning();

    await db.insert(eventParticipants).values({ eventId: created.id, userId: user.id, status: "approved" });

    if (user.role !== "admin" && !fullUser.canCreateEvent) {
      await db.update(users).set({ eventCreateCredits: sql`${users.eventCreateCredits} - 1` }).where(eq(users.id, user.id));
    }

    return NextResponse.json({ ok: true, event: created });
  } catch (err) {
    return errorResponse(err);
  }
}