import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminLogs, users, securityAuditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: adminLogs.id,
        action: adminLogs.action,
        targetType: adminLogs.targetType,
        targetId: adminLogs.targetId,
        detail: adminLogs.detail,
        createdAt: adminLogs.createdAt,
        adminName: users.name,
      })
      .from(adminLogs)
      .leftJoin(users, eq(adminLogs.adminId, users.id))
      .orderBy(desc(adminLogs.createdAt))
      .limit(300);
    const auditRows = await db
      .select({
        id: securityAuditLogs.id,
        action: securityAuditLogs.action,
        targetType: securityAuditLogs.targetType,
        targetId: securityAuditLogs.targetId,
        detail: securityAuditLogs.context,
        createdAt: securityAuditLogs.createdAt,
        adminName: users.name,
      })
      .from(securityAuditLogs)
      .leftJoin(users, eq(securityAuditLogs.actorUserId, users.id))
      .orderBy(desc(securityAuditLogs.createdAt))
      .limit(300);
    const combined = [...rows, ...auditRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 300);
    return NextResponse.json({ logs: combined });
  } catch (err) {
    return errorResponse(err);
  }
}
