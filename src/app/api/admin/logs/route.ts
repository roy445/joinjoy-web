import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, securityAuditLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const source = req.nextUrl.searchParams.get("source") || "all";
    const action = req.nextUrl.searchParams.get("action")?.trim() || "";
    const requestedLimit = Number(req.nextUrl.searchParams.get("limit") || 300);
    const limit = Number.isSafeInteger(requestedLimit) ? Math.min(300, Math.max(1, requestedLimit)) : 300;
    const includeAdmin = source === "all" || source === "admin";
    const includeSecurity = source === "all" || source === "security";

    const rows = includeAdmin
      ? await db
        .select({ id: adminLogs.id, action: adminLogs.action, targetType: adminLogs.targetType, targetId: adminLogs.targetId, detail: adminLogs.detail, metadata: adminLogs.detail, createdAt: adminLogs.createdAt, actorName: users.name })
        .from(adminLogs)
        .leftJoin(users, eq(adminLogs.adminId, users.id))
        .where(action ? eq(adminLogs.action, action) : undefined)
        .orderBy(desc(adminLogs.createdAt))
        .limit(limit)
      : [];
    const auditRows = includeSecurity
      ? await db
        .select({ id: securityAuditLogs.id, action: securityAuditLogs.action, targetType: securityAuditLogs.targetType, targetId: securityAuditLogs.targetId, detail: securityAuditLogs.context, metadata: securityAuditLogs.metadata, createdAt: securityAuditLogs.createdAt, actorName: users.name })
        .from(securityAuditLogs)
        .leftJoin(users, eq(securityAuditLogs.actorUserId, users.id))
        .where(action ? eq(securityAuditLogs.action, action) : undefined)
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(limit)
      : [];
    const combined = [
      ...rows.map((row) => ({ ...row, source: "admin" as const, id: `admin-${row.id}` })),
      ...auditRows.map((row) => ({ ...row, source: "security" as const, id: `security-${row.id}` })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
    return NextResponse.json({ logs: combined });
  } catch (err) {
    return errorResponse(err);
  }
}
