import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { oneTimeCodes, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `verify-group-code-${user.id}`), 10, 10 * 60 * 1000)) {
      throw new Error("嘗試次數過多，請稍後再試");
    }
    const body = await req.json().catch(() => null);
    const code = String(body?.code || "").trim().toUpperCase();
    if (!code) throw new Error("請輸入代碼");

    const [record] = await db
      .select()
      .from(oneTimeCodes)
      .where(and(eq(oneTimeCodes.code, code), eq(oneTimeCodes.type, "group"), eq(oneTimeCodes.revoked, false), isNull(oneTimeCodes.usedBy)))
      .limit(1);

    if (!record) throw new Error("代碼無效、已被使用或已撤銷");
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) throw new Error("代碼已過期");

    await db.update(oneTimeCodes).set({ usedBy: user.id, usedAt: new Date() }).where(eq(oneTimeCodes.id, record.id));
    await db.update(users).set({ groupCreateCredits: sql`${users.groupCreateCredits} + 1` }).where(eq(users.id, user.id));

    return NextResponse.json({ ok: true, message: "驗證成功，你已獲得 1 次建立社團的權限！" });
  } catch (err) {
    return errorResponse(err);
  }
}