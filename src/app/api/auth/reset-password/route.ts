import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens, sessions } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const token = String(body?.token || "");
  const password = String(body?.password || "");

  if (password.length < 8) {
    return NextResponse.json({ error: "密碼至少需要 8 個字元" }, { status: 400 });
  }

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, false), gt(passwordResetTokens.expiresAt, new Date())))
    .limit(1);

  if (!record) {
    return NextResponse.json({ error: "重設連結已失效，請重新申請" }, { status: 400 });
  }

  await db.update(users).set({ passwordHash: hashPassword(password), updatedAt: new Date() }).where(eq(users.id, record.userId));
  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, record.id));
  await db.delete(sessions).where(eq(sessions.userId, record.userId));

  return NextResponse.json({ ok: true });
}
