import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { createEventRequests, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin } from "@/lib/security";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: createEventRequests.id,
        reason: createEventRequests.reason,
        status: createEventRequests.status,
        createdAt: createEventRequests.createdAt,
        userId: createEventRequests.userId,
        userName: users.name,
        userEmail: users.email,
      })
      .from(createEventRequests)
      .leftJoin(users, eq(createEventRequests.userId, users.id))
      .orderBy(desc(createEventRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const action = String(body?.action || "");
    if (!id) throw new Error("缺少 ID");

    const [request] = await db.select().from(createEventRequests).where(eq(createEventRequests.id, id)).limit(1);
    if (!request) throw new Error("找不到申請紀錄");
    if (request.status !== "pending") throw new Error("此申請已審核過");

    if (action === "approve") {
      await db.update(createEventRequests).set({ status: "approved", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(createEventRequests.id, id));
      await db.update(users).set({ eventCreateCredits: sql`${users.eventCreateCredits} + 1` }).where(eq(users.id, request.userId));
      await notify({ userId: request.userId, type: "create_request_approved", title: "建立活動申請已通過", content: "管理員已核准您的申請，您現在可以建立一場活動了！", link: "/events/create" });
      await logAdminAction(admin.id, "核准建立活動申請", "create_event_request", id);
    } else if (action === "reject") {
      await db.update(createEventRequests).set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(createEventRequests.id, id));
      await notify({ userId: request.userId, type: "create_request_rejected", title: "建立活動申請未通過", content: "很抱歉，您的申請未獲得核准。" });
      await logAdminAction(admin.id, "駁回建立活動申請", "create_event_request", id);
    } else {
      throw new Error("不支援的操作");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
