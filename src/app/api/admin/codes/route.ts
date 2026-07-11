import { randomInt } from "node:crypto";
import { desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, oneTimeCodes } from "@/db/schema";
import { getCurrentUser, hashAccessCode, requireAdmin } from "@/lib/auth";

function generateCode() {
  return String(randomInt(0, 1000000)).padStart(6, "0");
}

export async function GET() {
  try {
    await requireAdmin();
    const codes = await db.select({ id: oneTimeCodes.id, label: oneTimeCodes.label, usedBy: oneTimeCodes.usedBy, usedAt: oneTimeCodes.usedAt, expiresAt: oneTimeCodes.expiresAt, createdAt: oneTimeCodes.createdAt }).from(oneTimeCodes).orderBy(desc(oneTimeCodes.createdAt));
    return NextResponse.json({ codes });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { label?: unknown; expiresInDays?: unknown };
    const code = generateCode();
    const expiresInDays = typeof body.expiresInDays === "number" ? Math.min(365, Math.max(1, Math.floor(body.expiresInDays))) : 30;
    const [created] = await db.insert(oneTimeCodes).values({ codeHash: hashAccessCode(code), label: typeof body.label === "string" ? body.label.trim().slice(0, 100) : null, createdBy: admin.id, expiresAt: new Date(Date.now() + expiresInDays * 86400000) }).returning({ id: oneTimeCodes.id, label: oneTimeCodes.label, expiresAt: oneTimeCodes.expiresAt, createdAt: oneTimeCodes.createdAt });
    await db.insert(auditLogs).values({ actorId: admin.id, action: "access_code_created", entityType: "one_time_code", entityId: created.id });
    return NextResponse.json({ code, record: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "缺少代碼 id" }, { status: 400 });
    await db.delete(oneTimeCodes).where(eq(oneTimeCodes.id, id));
    await db.insert(auditLogs).values({ actorId: admin.id, action: "access_code_revoked", entityType: "one_time_code", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
