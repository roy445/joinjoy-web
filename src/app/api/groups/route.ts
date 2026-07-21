import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { sanitize, isSameOrigin, rateLimit, clientKey, generateInviteCode } from "@/lib/security";

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode();
    const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, code)).limit(1);
    if (!existing) return code;
  }
  throw new Error("代碼產生失敗，請再試一次");
}

// Groups are discoverable by everyone (name/description/cover/member count),
// so people can find and request to join private groups from search — but
// the group's events and member list stay hidden until membership is approved.
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const q = req.nextUrl.searchParams.get("q")?.trim();

    const memberCountSub = db
      .select({ groupId: groupMembers.groupId, count: sql<number>`count(*)`.as("count") })
      .from(groupMembers)
      .where(eq(groupMembers.status, "approved"))
      .groupBy(groupMembers.groupId)
      .as("mc");

    const rows = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        coverImageUrl: groups.coverImageUrl,
        isPrivate: groups.isPrivate,
        ownerId: groups.ownerId,
        ownerName: users.name,
        createdAt: groups.createdAt,
        memberCount: sql<number>`coalesce(${memberCountSub.count}, 0)`,
      })
      .from(groups)
      .leftJoin(users, eq(groups.ownerId, users.id))
      .leftJoin(memberCountSub, eq(memberCountSub.groupId, groups.id))
      .where(q ? ilike(groups.name, `%${q}%`) : undefined)
      .orderBy(desc(groups.createdAt))
      .limit(60);

    let myMemberships: Record<number, string> = {};
    if (currentUser) {
      const mine = await db
        .select({ groupId: groupMembers.groupId, status: groupMembers.status })
        .from(groupMembers)
        .where(eq(groupMembers.userId, currentUser.id));
      myMemberships = Object.fromEntries(mine.map((m) => [m.groupId, m.status]));
    }

    return NextResponse.json({
      groups: rows.map((g) => ({ ...g, myStatus: myMemberships[g.id] ?? null })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (user.isBlacklisted) throw new Error("您的帳號已被列入黑名單，無法建立社團");
    if (!rateLimit(clientKey(req, `create-group-${user.id}`), 8, 60 * 60 * 1000)) {
      throw new Error("建立社團太頻繁，請稍後再試");
    }

    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!fullUser.groupGuidelinesAgreedAt) {
      throw new Error("請先詳閱並同意社團規則");
    }
    const hasPermission = user.role === "admin" || fullUser.canCreateGroup || fullUser.groupCreateCredits > 0;
    if (!hasPermission) {
      throw new Error("您尚未取得建立社團權限，請先輸入一次性代碼或申請管理員審核");
    }

    const body = await req.json().catch(() => null);
    if (!body) throw new Error("格式錯誤");

    const name = sanitize(String(body.name || ""), 100);
    const description = sanitize(String(body.description || ""), 2000);
    if (!name || name.length < 2) throw new Error("請輸入社團名稱");
    if (!description || description.length < 10) throw new Error("請輸入至少 10 個字的社團介紹");

    const inviteCode = await createUniqueInviteCode();

    const [created] = await db
      .insert(groups)
      .values({
        name,
        description,
        coverImageUrl: body.coverImageUrl || null,
        isPrivate: body.isPrivate !== false,
        inviteCode,
        ownerId: user.id,
      })
      .returning();

    await db.insert(groupMembers).values({ groupId: created.id, userId: user.id, role: "owner", status: "approved" });

    if (user.role !== "admin" && !fullUser.canCreateGroup) {
      await db.update(users).set({ groupCreateCredits: sql`${users.groupCreateCredits} - 1` }).where(eq(users.id, user.id));
    }

    return NextResponse.json({ ok: true, group: created });
  } catch (err) {
    return errorResponse(err);
  }
}