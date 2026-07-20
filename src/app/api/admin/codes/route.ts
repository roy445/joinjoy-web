import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oneTimeCodes, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { isSameOrigin } from "@/lib/security";
import crypto from "crypto";

export async function GET() {
  try {
    await requireAdmin();
    const creator = { id: users.id, name: users.name };
    const rows = await db
      .select({
        id: oneTimeCodes.id,
        code: oneTimeCodes.code,
        revoked: oneTimeCodes.revoked,
        expiresAt: oneTimeCodes.expiresAt,
        usedAt: oneTimeCodes.usedAt,
        createdAt: oneTimeCodes.createdAt,
        usedBy: oneTimeCodes.usedBy,
        usedByName: users.name,
      })
      .from(oneTimeCodes)
      .leftJoin(users, eq(oneTimeCodes.usedBy, users.id))
      .orderBy(desc(oneTimeCodes.createdAt));
    return NextResponse.json({ codes: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const count = Math.max(1, Math.min(20, Number(body?.count) || 1));
    const expiresInDays = body?.expiresInDays ? Number(body.expiresInDays) : null;

    const codes = Array.from({ length: count }, () => ({
      code: `JOINJOY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      createdBy: admin.id,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86400000) : null,
    }));

    const inserted = await db.insert(oneTimeCodes).values(codes).returning();
    await logAdminAction(admin.id, "產生一次性代碼", "one_time_code", undefined, `共產生 ${count} 組`);

    return NextResponse.json({ ok: true, codes: inserted });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) throw new Error("缺少 ID");
    await db.update(oneTimeCodes).set({ revoked: true }).where(eq(oneTimeCodes.id, id));
    await logAdminAction(admin.id, "撤銷一次性代碼", "one_time_code", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
