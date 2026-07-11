import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, reports, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const result = await db.select({ id: reports.id, eventId: reports.eventId, commentId: reports.commentId, reason: reports.reason, details: reports.details, status: reports.status, createdAt: reports.createdAt, reporterName: users.name }).from(reports).innerJoin(users, eq(reports.reporterId, users.id)).orderBy(desc(reports.createdAt));
    return NextResponse.json({ reports: result });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { reportId?: unknown; status?: unknown };
    if (typeof body.reportId !== "string" || !["approved", "rejected"].includes(String(body.status))) return NextResponse.json({ message: "案件資料不正確" }, { status: 400 });
    const [updated] = await db.update(reports).set({ status: body.status as "approved" | "rejected" }).where(eq(reports.id, body.reportId)).returning({ id: reports.id, status: reports.status });
    await db.insert(auditLogs).values({ actorId: admin.id, action: "report_reviewed", entityType: "report", entityId: body.reportId, metadata: { status: body.status } });
    return NextResponse.json({ report: updated });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
