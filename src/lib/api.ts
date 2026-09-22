import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";

export function errorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "發生未知錯誤" }, { status: 500 });
}

export async function logAdminAction(
  adminId: number,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: string
) {
  const { db } = await import("@/db");
  const { adminLogs } = await import("@/db/schema");
  await db.insert(adminLogs).values({
    adminId,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    detail: detail ?? null,
  });
}

export async function logSecurityAudit(input: {
  actorUserId?: number | null;
  action: string;
  targetType?: string;
  targetId?: number;
  context?: string;
  metadata?: Record<string, unknown>;
}) {
  const { db } = await import("@/db");
  const { securityAuditLogs } = await import("@/db/schema");
  await db.insert(securityAuditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    context: input.context ?? null,
    metadata: input.metadata ?? {},
  });
}
