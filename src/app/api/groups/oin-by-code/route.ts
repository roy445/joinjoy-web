import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin, rateLimit, clientKey } from "@/lib/security";

// Joining with a valid invite code always grants instant "approved" membership —
// knowing the code is treated as proof of invitation by the group owner, so
// there is no separate manual review step for this path.
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `join-by-code-${user.id}`), 15, 10 * 60 * 1000)) {
      throw new Error("嘗試次數過多，請稍後再試");
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code || "").trim().toUpperCase();
    if (!code) throw new Error("請輸入邀請代碼");

    const [group] = await db.select().from(groups).where(eq(groups.inviteCode, code)).limit(1);
    if (!group) throw new Error("邀請代碼無效，請確認代碼是否正確");

    if (group.ownerId === user.id) throw new Error("您是此社團的建立者");

    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, user.id)))
      .limit(1);

    if (existing?.status === "approved") throw new Error("您已經是此社團的成員");

    if (existing) {
      await db.update(groupMembers).set({ status: "approved", joinedAt: new Date() }).where(eq(groupMembers.id, existing.id));
    } else {
      await db.insert(groupMembers).values({ groupId: group.id, userId: user.id, role: "member", status: "approved" });
    }

    await notify({
      userId: group.ownerId,
      type: "group_join_request",
      title: "有新成員使用邀請代碼加入",
      content: `${user.name} 使用邀請代碼加入了「${group.name}」`,
      link: `/groups/${group.id}`,
    });

    return NextResponse.json({ ok: true, groupId: group.id, groupName: group.name, message: `已成功加入「${group.name}」！` });
  } catch (err) {
    return errorResponse(err);
  }
}