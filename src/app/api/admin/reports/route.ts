import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, events, reportActions, reports, securityAuditLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { clientKey, isSameOrigin, rateLimit, sanitize } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const status = req.nextUrl.searchParams.get("status");
    const type = req.nextUrl.searchParams.get("type");
    const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || 100);
    const limit = Number.isSafeInteger(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 100;
    const conditions = [];
    if (["pending", "resolved", "rejected"].includes(status || "")) conditions.push(eq(reports.status, status!));
    if (["event", "comment", "chat", "user"].includes(type || "")) conditions.push(eq(reports.type, type!));
    const rows = await db
      .select({
        id: reports.id,
        type: reports.type,
        targetId: reports.targetId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
        reviewedBy: reports.reviewedBy,
        reporterName: users.name,
        reporterId: reports.reporterId,
        eventId: reports.eventId,
        eventTitle: events.title,
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .leftJoin(events, eq(reports.eventId, events.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(limit);

    const reportIds = rows.map((row) => row.id);
    const actions = reportIds.length
      ? await db
        .select({ id: reportActions.id, reportId: reportActions.reportId, action: reportActions.action, note: reportActions.note, createdAt: reportActions.createdAt, adminName: users.name })
        .from(reportActions)
        .leftJoin(users, eq(reportActions.adminId, users.id))
        .where(inArray(reportActions.reportId, reportIds))
        .orderBy(desc(reportActions.createdAt))
      : [];
    const actionsByReport = new Map<number, typeof actions>();
    for (const action of actions) {
      const list = actionsByReport.get(action.reportId) || [];
      list.push(action);
      actionsByReport.set(action.reportId, list);
    }
    return NextResponse.json({ reports: rows.map((row) => ({ ...row, actions: actionsByReport.get(row.id) || [] })) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-reports:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const action = String(body?.action || "");
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("缺少有效檢舉 ID");
    const status = action === "resolve" ? "resolved" : action === "reject" ? "rejected" : null;
    if (!status) throw new Error("不支援的操作");
    const note = sanitize(String(body?.note || ""), 1000) || null;
    const [report] = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
    if (!report) throw new Error("找不到檢舉紀錄");

    await db.transaction(async (tx) => {
      await tx.update(reports).set({ status, reviewedBy: admin.id }).where(eq(reports.id, id));
      await tx.insert(reportActions).values({ reportId: id, adminId: admin.id, action: status, note });
      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: "處理檢舉案件",
        targetType: "report",
        targetId: id,
        detail: JSON.stringify({ status, note }),
      });
      await tx.insert(securityAuditLogs).values({
        actorUserId: admin.id,
        action: "report_reviewed",
        targetType: "report",
        targetId: id,
        context: "admin",
        metadata: { status, note },
      });
    });
    await notify({ userId: report.reporterId, type: "report_update", title: "您的檢舉已處理", content: `檢舉案件已${status === "resolved" ? "查證屬實並處理" : "審核後不成立"}` });
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return errorResponse(err);
  }
}
