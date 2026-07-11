import { and, desc, eq, gt, ilike, isNull, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { createRequests, eventParticipants, events, oneTimeCodes, users } from "@/db/schema";
import { getCurrentUser, hashAccessCode } from "@/lib/auth";

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function parseDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category");
    const region = url.searchParams.get("region");
    const conditions = [eq(events.visibility, "public"), eq(events.status, "active")];
    if (query) conditions.push(or(ilike(events.title, `%${query}%`), ilike(events.description, `%${query}%`), ilike(events.location, `%${query}%`))!);
    if (category) conditions.push(eq(events.category, category));
    if (region) conditions.push(ilike(events.location, `%${region}%`));

    const rows = await db
      .select({
        id: events.id,
        title: events.title,
        coverUrl: events.coverUrl,
        category: events.category,
        description: events.description,
        startAt: events.startAt,
        endAt: events.endAt,
        location: events.location,
        mapUrl: events.mapUrl,
        capacity: events.capacity,
        price: events.price,
        contact: events.contact,
        notes: events.notes,
        requiresApproval: events.requiresApproval,
        allowWaitlist: events.allowWaitlist,
        ageLimit: events.ageLimit,
        genderLimit: events.genderLimit,
        allowCompanion: events.allowCompanion,
        visibility: events.visibility,
        status: events.status,
        tags: events.tags,
        createdAt: events.createdAt,
        hostId: users.id,
        hostName: users.name,
        hostAvatarUrl: users.avatarUrl,
        hostCreditScore: users.creditScore,
      })
      .from(events)
      .innerJoin(users, eq(events.hostId, users.id))
      .where(and(...conditions))
      .orderBy(desc(events.startAt));

    const result = await Promise.all(rows.map(async (event) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, event.id), eq(eventParticipants.status, "joined")));
      return { ...event, attendeeCount: count ?? 0 };
    }));

    return NextResponse.json({ events: result });
  } catch {
    return NextResponse.json({ message: "目前無法取得活動" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入後再建立活動" }, { status: 401 });
    if (user.status !== "active") return NextResponse.json({ message: "目前帳號無法建立活動" }, { status: 403 });

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const coverUrl = typeof body.coverUrl === "string" ? body.coverUrl.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";
    const contact = typeof body.contact === "string" ? body.contact.trim() : "";
    const startAt = parseDate(body.startAt);
    const endAt = parseDate(body.endAt);
    const capacity = typeof body.capacity === "number" ? Math.floor(body.capacity) : Number(body.capacity);
    const price = typeof body.price === "number" ? Math.floor(body.price) : Number(body.price ?? 0);
    const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 10) : [];

    if (title.length < 4 || title.length > 160) return NextResponse.json({ message: "活動名稱需為 4–160 個字元" }, { status: 400 });
    if (!coverUrl || !/^https?:\/\//i.test(coverUrl)) return NextResponse.json({ message: "請提供有效的封面圖片網址" }, { status: 400 });
    if (!category || description.length < 20 || !location || !contact) return NextResponse.json({ message: "請完整填寫活動分類、介紹、地點與聯絡方式" }, { status: 400 });
    if (!startAt || !endAt || endAt <= startAt) return NextResponse.json({ message: "活動開始與結束時間不正確" }, { status: 400 });
    if (startAt <= new Date()) return NextResponse.json({ message: "活動時間需要設定在未來" }, { status: 400 });
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 1000) return NextResponse.json({ message: "名額上限需介於 2–1000 人" }, { status: 400 });
    if (!Number.isInteger(price) || price < 0 || price > 100000) return NextResponse.json({ message: "活動費用不正確" }, { status: 400 });

    const accessCode = typeof body.accessCode === "string" ? body.accessCode.trim() : "";
    const result = await db.transaction(async (tx) => {
      const code = accessCode
        ? (await tx.select({ id: oneTimeCodes.id }).from(oneTimeCodes).where(and(eq(oneTimeCodes.codeHash, hashAccessCode(accessCode)), isNull(oneTimeCodes.usedAt), or(isNull(oneTimeCodes.expiresAt), gt(oneTimeCodes.expiresAt, new Date())))).limit(1))[0]
        : undefined;
      const approvedRequest = !code
        ? (await tx.select({ id: createRequests.id }).from(createRequests).where(and(eq(createRequests.userId, user.id), eq(createRequests.status, "approved"), isNull(createRequests.usedAt))).limit(1))[0]
        : undefined;

      if (!code && !approvedRequest) throw new Error("CREATE_PERMISSION_REQUIRED");

      const [event] = await tx.insert(events).values({
        hostId: user.id,
        title,
        coverUrl,
        category,
        description,
        startAt,
        endAt,
        location,
        mapUrl: typeof body.mapUrl === "string" ? body.mapUrl.trim() : null,
        capacity,
        price,
        contact,
        notes: typeof body.notes === "string" ? body.notes.trim() : null,
        requiresApproval: asBoolean(body.requiresApproval),
        allowWaitlist: asBoolean(body.allowWaitlist, true),
        ageLimit: asBoolean(body.ageLimit),
        genderLimit: typeof body.genderLimit === "string" && body.genderLimit ? body.genderLimit : null,
        allowCompanion: asBoolean(body.allowCompanion),
        visibility: body.visibility === "private" ? "private" : "public",
        tags,
      }).returning({ id: events.id, title: events.title });

      if (code) {
        await tx.update(oneTimeCodes).set({ usedBy: user.id, usedAt: new Date() }).where(eq(oneTimeCodes.id, code.id));
      } else if (approvedRequest) {
        await tx.update(createRequests).set({ usedAt: new Date() }).where(eq(createRequests.id, approvedRequest.id));
      }
      return event;
    });

    return NextResponse.json({ event: result }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CREATE_PERMISSION_REQUIRED") {
      return NextResponse.json({ message: "請輸入有效的一次性代碼，或等待建立活動申請通過" }, { status: 403 });
    }
    return NextResponse.json({ message: "建立活動失敗，請確認資料內容" }, { status: 500 });
  }
}
