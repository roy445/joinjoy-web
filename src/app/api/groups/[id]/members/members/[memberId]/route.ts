import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr, memberId: memberIdStr } = await params;
    const groupId = Number(idStr);
    const memberId = Number(memberIdStr);

    const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId !== user.id && user.role !== "admin") throw new Error("僅社團建立者可管理成員");

    const [member] = await db.select().from(groupMembers).where(eq(groupMembers.id, memberId)).limit(1);
    if (!member || member.groupId !== groupId) throw new Error("找不到成員紀錄");

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "");
    const actionMap: Record<string, { status: string; title: string }> = {
      approve: { status: "approved", title: "您的社團加入申請已通過" },
      reject: { status: "rejected", title: "您的社團加入申請未通過" },
      remove: { status: "rejected", title: "您已被移出社團" },
    };
    const config = actionMap[action];
    if (!config) throw new Error("不支援的操作");

    await db.update(groupMembers).set({ status: config.status }).where(eq(groupMembers.id, memberId));
    await notify({ userId: member.userId, type: "group_member_status", title: config.title, content: `社團：「${group.name}」`, link: `/groups/${groupId}` });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}