import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, honorNotifications, userGroupMembers, userGroups, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { clientKey, isSameOrigin, rateLimit, sanitize } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    }

    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-group-grant:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as {
      userId?: unknown;
      groupId?: unknown;
      reason?: unknown;
      expiresAt?: unknown;
    } | null;
    const userId = Number(body?.userId);
    const groupId = Number(body?.groupId);
    const reason = sanitize(String(body?.reason ?? ""), 1000);

    if (!Number.isSafeInteger(userId) || userId <= 0 || !Number.isSafeInteger(groupId) || groupId <= 0) {
      return NextResponse.json({ error: "使用者或身份組 ID 不正確" }, { status: 400 });
    }
    if (reason.length < 2) {
      return NextResponse.json({ error: "授予身份組必須填寫原因" }, { status: 400 });
    }

    let expiresAt: Date | null = null;
    if (body?.expiresAt !== undefined && body.expiresAt !== null && String(body.expiresAt).trim() !== "") {
      expiresAt = new Date(String(body.expiresAt));
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: "到期時間必須是未來的有效時間" }, { status: 400 });
      }
    }

    const result = await db.transaction(async (tx) => {
      // Serialise grants for the same user/group pair, even before a partial
      // unique index is installed on an older production database.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId}, ${groupId})`);

      const [targetUser] = await tx.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser) throw new Error("找不到使用者");

      const [group] = await tx.select().from(userGroups).where(eq(userGroups.id, groupId)).limit(1);
      if (!group) throw new Error("找不到身份組");
      if (!group.isActive) throw new Error("這個身份組已停用，無法授予");

      const activeGrantResult = await tx.execute(sql`
        SELECT id
        FROM user_group_members
        WHERE user_id = ${userId}
          AND group_id = ${groupId}
          AND revoked_at IS NULL
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1
      `);
      if (activeGrantResult.rows.length > 0) {
        throw new Error("該使用者已擁有這個有效身份組");
      }

      const [grant] = await tx.insert(userGroupMembers).values({
        userId,
        groupId,
        assignedBy: admin.id,
        assignedReason: reason,
        expiresAt,
      }).returning({ id: userGroupMembers.id, createdAt: userGroupMembers.createdAt });

      if (!grant) throw new Error("身份組授予失敗");

      const privilegeText = [
        group.dailyAiLimit ? `每日 AI 額度 ${group.dailyAiLimit} 次` : null,
        group.jCoinBonus ? `活動 J 幣加成 ${group.jCoinBonus}%` : null,
      ].filter(Boolean).join("、") || "解鎖此身份組的專屬標示";

      await tx.insert(honorNotifications).values({
        userId,
        type: "group",
        targetId: `group-grant-${grant.id}`,
        title: `🎉 恭喜！你獲得「${group.name}」身份`,
        content: `授予原因：${reason}\n新增特權：${privilegeText}${expiresAt ? `\n有效至：${expiresAt.toLocaleString("zh-TW")}` : ""}`,
      });

      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: "授予身份組",
        targetType: "user_group",
        targetId: grant.id,
        detail: JSON.stringify({ userId, groupId, reason, expiresAt }),
      });

      return { grantId: grant.id, groupName: group.name, createdAt: grant.createdAt };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
