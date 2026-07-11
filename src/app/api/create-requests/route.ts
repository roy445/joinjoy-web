import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, createRequests, notifications, users } from "@/db/schema";
import { getCurrentUser, requireAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const body = (await request.json()) as { reason?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 10 || reason.length > 1000) return NextResponse.json({ message: "申請理由請輸入 10–1000 個字元" }, { status: 400 });

    const [pending] = await db.select({ id: createRequests.id }).from(createRequests).where(and(eq(createRequests.userId, user.id), eq(createRequests.status, "pending"))).limit(1);
    if (pending) return NextResponse.json({ message: "你已經有一筆待審核申請" }, { status: 409 });

    const [created] = await db.insert(createRequests).values({ userId: user.id, reason }).returning({ id: createRequests.id });
    await db.insert(auditLogs).values({ actorId: user.id, action: "create_request_submitted", entityType: "create_request", entityId: created.id });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "申請送出失敗" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const result = await db.select({ id: createRequests.id, userId: createRequests.userId, userName: users.name, userEmail: users.email, reason: createRequests.reason, status: createRequests.status, createdAt: createRequests.createdAt, reviewedAt: createRequests.reviewedAt }).from(createRequests).innerJoin(users, eq(createRequests.userId, users.id)).orderBy(desc(createRequests.createdAt));
    return NextResponse.json({ requests: result });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
