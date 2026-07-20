import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blacklistRequests, blacklist, users, events } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify } from "@/lib/notify";

export async function GET() {
  try {
    await requireAdmin();
    const host = users;
    const requests = await db
      .select({
        id: blacklistRequests.id,
        reason: blacklistRequests.reason,
        description: blacklistRequests.description,
        evidenceUrls: blacklistRequests.evidenceUrls,
        status: blacklistRequests.status,
        createdAt: blacklistRequests.createdAt,
        hostId: blacklistRequests.hostId,
        hostName: host.name,
        targetUserId: blacklistRequests.targetUserId,
        eventId: blacklistRequests.eventId,
        eventTitle: events.title,
      })
      .from(blacklistRequests)
      .leftJoin(host, eq(blacklistRequests.hostId, host.id))
      .leftJoin(events, eq(blacklistRequests.eventId, events.id))
      .orderBy(desc(blacklistRequests.createdAt));

    const targetNames = await db.select({ id: users.id, name: users.name }).from(users);
    const nameMap = new Map(targetNames.map((t) => [t.id, t.name]));

    const activeList = await db
      .select({ id: blacklist.id, userId: blacklist.userId, reason: blacklist.reason, createdAt: blacklist.createdAt, userName: users.name })
      .from(blacklist)
      .leftJoin(users, eq(blacklist.userId, users.id))
      .where(eq(blacklist.active, true))
      .orderBy(desc(blacklist.createdAt));

    return NextResponse.json({
      requests: requests.map((r) => ({ ...r, targetName: nameMap.get(r.targetUserId) })),
      activeList,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const action = String(body?.action || "");
    if (!id) throw new Error("缺少 ID");

    const [request] = await db.select().from(blacklistRequests).where(eq(blacklistRequests.id, id)).limit(1);
    if (!request) throw new Error("找不到申請紀錄");
    if (request.status !== "pending") throw new Error("此案件已審核過");

    if (action === "approve") {
      await db.update(blacklistRequests).set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(blacklistRequests.id, id));
      await db.insert(blacklist).values({ userId: request.targetUserId, reason: request.reason, sourceRequestId: id, addedBy: admin.id });
      await db
        .update(users)
        .set({ isBlacklisted: true, creditScore: sql`GREATEST(0, ${users.creditScore} - 30)` })
        .where(eq(users.id, request.targetUserId));
      await notify({
        userId: request.targetUserId,
        type: "blacklist_added",
        title: "您已被列入黑名單",
        content: `經查核屬實，因「${request.reason}」，您已被列入平台黑名單，信用分數已扣分，未來報名活動將顯示標記。`,
      });
      await logAdminAction(admin.id, "核准黑名單申請並列管使用者", "blacklist_request", id, request.reason);
    } else if (action === "reject") {
      await db.update(blacklistRequests).set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(blacklistRequests.id, id));
      await notify({ userId: request.hostId, type: "blacklist_request_rejected", title: "黑名單申請未通過", content: "經查核後，您的黑名單申請不成立。" });
      await logAdminAction(admin.id, "駁回黑名單申請", "blacklist_request", id);
    } else {
      throw new Error("不支援的操作");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) throw new Error("缺少 ID");
    const [entry] = await db.select().from(blacklist).where(eq(blacklist.id, id)).limit(1);
    if (!entry) throw new Error("找不到黑名單紀錄");
    await db.update(blacklist).set({ active: false }).where(eq(blacklist.id, id));
    await db.update(users).set({ isBlacklisted: false }).where(eq(users.id, entry.userId));
    await notify({ userId: entry.userId, type: "blacklist_removed", title: "您已被移出黑名單", content: "管理員已重新審核並將您移出黑名單。" });
    await logAdminAction(admin.id, "解除黑名單", "user", entry.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
