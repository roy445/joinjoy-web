import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, users, events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify } from "@/lib/notify";

export async function GET() {
  try {
    await requireAdmin();
    const reporter = users;
    const rows = await db
      .select({
        id: reports.id,
        type: reports.type,
        targetId: reports.targetId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: reporter.name,
        eventId: reports.eventId,
        eventTitle: events.title,
      })
      .from(reports)
      .leftJoin(reporter, eq(reports.reporterId, reporter.id))
      .leftJoin(events, eq(reports.eventId, events.id))
      .orderBy(desc(reports.createdAt));
    return NextResponse.json({ reports: rows });
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

    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) throw new Error("找不到檢舉紀錄");

    const status = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : null;
    if (!status) throw new Error("不支援的操作");

    await db.update(reports).set({ status, reviewedBy: admin.id }).where(eq(reports.id, id));
    await notify({ userId: report.reporterId, type: "report_update", title: "您的檢舉已處理", content: `檢舉案件已${status === "resolved" ? "查證屬實並處理" : "審核後不成立"}` });
    await logAdminAction(admin.id, "處理檢舉案件", "report", id, status);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
