import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const token = String(body?.token || "");
  if (!token) return NextResponse.json({ error: "缺少驗證碼" }, { status: 400 });

  const [record] = await db
    .select()
    .from(emailVerificationTokens)
    .where(and(eq(emailVerificationTokens.token, token), eq(emailVerificationTokens.used, false), gt(emailVerificationTokens.expiresAt, new Date())))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "驗證連結已失效或已過期，請重新發送驗證信" }, { status: 400 });
  }

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, record.userId));
  await db.update(emailVerificationTokens).set({ used: true }).where(eq(emailVerificationTokens.id, record.id));

  return NextResponse.json({ ok: true });
}