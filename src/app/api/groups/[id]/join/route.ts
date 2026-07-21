import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin, rateLimit, clientKey } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const groupId = Number(idStr);
    if (!rateLimit(clientKey(req, `join-group-${user.id}`), 15, 10 * 60 * 1000)) throw new Error("操作太頻繁，請稍後再試");

    const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId === user.id) throw new Error("您是此社團的建立者");

    const [existing] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)))
      .limit(1);
    if (existing && existing.status !== "rejected") {
      throw new Error(existing.status === "approved" ? "您已經是此社團的成員" : "您已送出申請，請等候審核");
    }

    // Public groups let anyone join instantly; private groups require the
    // owner to approve each request.
    const autoApprove = !group.isPrivate;
    const status = autoApprove ? "approved" : "pending";

    if (existing) {
      await db.update(groupMembers).set({ status, joinedAt: new Date() }).where(eq(groupMembers.id, existing.id));
    } else {
      await db.insert(groupMembers).values({ groupId, userId: user.id, role: "member", status });
    }

    if (autoApprove) {
      await notify({
        userId: group.ownerId,
        type: "group_join_request",
        title: "有新成員加入你的社團",
        content: `${user.name} 加入了「${group.name}」`,
        link: `/groups/${groupId}`,
      });
    } else {
      await notify({
        userId: group.ownerId,
        type: "group_join_request",
        title: "有人申請加入你的社團",
        content: `${user.name} 申請加入「${group.name}」`,
        link: `/groups/${groupId}`,
      });
    }

    return NextResponse.json({
      ok: true,
      status,
      message: autoApprove ? "加入成功！" : "申請已送出，請等候社團建立者審核",
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const groupId = Number(idStr);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId === user.id) throw new Error("建立者無法退出社團，請改用刪除社團功能");

    await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, user.id)));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}