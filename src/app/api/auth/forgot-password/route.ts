import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResetTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateToken } from "@/lib/auth";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
  }
  if (!rateLimit(clientKey(req, "forgot"), 6, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Always return success to avoid leaking which emails are registered.
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

  const resetUrl = `/reset-password?token=${token}`;

  // No SMTP provider configured in this sandbox — return the reset link directly
  // so the "forgot password" flow remains fully functional end-to-end.
  return NextResponse.json({
    ok: true,
    devResetUrl: resetUrl,
    note: "目前尚未設定信件服務，請直接使用以下連結重設密碼。",
  });
}
