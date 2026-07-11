import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, createRequests, notifications } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

type Context = { params: Promise<{ requestId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin();
    const { requestId } = await params;
    const body = (await request.json()) as { status?: unknown };
    if (body.status !== "approved" && body.status !== "rejected") return NextResponse.json({ message: "審核狀態不正確" }, { status: 400 });
    const [updated] = await db.update(createRequests).set({ status: body.status, reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(createRequests.id, requestId)).returning({ id: createRequests.id, userId: createRequests.userId, status: createRequests.status });
    if (!updated) return NextResponse.json({ message: "找不到申請" }, { status: 404 });
    await db.insert(notifications).values({ userId: updated.userId, type: "create_request_review", title: body.status === "approved" ? "建立活動申請已通過" : "建立活動申請未通過", body: body.status === "approved" ? "你現在可以建立一場活動了。" : "這次申請未通過，歡迎補充資料後再次申請。", link: "/" });
    await db.insert(auditLogs).values({ actorId: admin.id, action: `create_request_${body.status}`, entityType: "create_request", entityId: requestId });
    return NextResponse.json({ request: updated });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
