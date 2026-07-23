import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword, generateToken } from "@/lib/auth";
import { isValidEmail, sanitizeText } from "@/lib/utils";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
  }
  if (!rateLimit(clientKey(req, "register"), 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "請求太頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = sanitizeText(String(body.name || ""), 50);

  if (!isValidEmail(email)) return NextResponse.json({ error: "Email 格式不正確" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "密碼至少需要 8 個字元" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "請輸入暱稱" }, { status: 400 });

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "此 Email 已被註冊" }, { status: 409 });
  }

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hashPassword(password), name })
    .returning({ id: users.id });

  await createSession(user.id);

  // Fire off a real verification email. The account remains usable while
  // unverified (only a reminder banner is shown) so the flow never locks
  // users out if the mail provider has a hiccup.
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokens).values({ userId: user.id, token, expiresAt });
  const verifyUrl = new URL(`/verify-email?token=${token}`, req.nextUrl.origin).toString();
  const result = await sendVerificationEmail(email, name, verifyUrl);

  return NextResponse.json({
    ok: true,
    emailSent: result.sent,
    error: result.sent ? undefined : result.error,
    // Only surface the raw verification link when no mail provider is
    // configured yet, so local/dev testing keeps working end-to-end.
    devVerifyUrl: result.sent ? undefined : verifyUrl,
  });
}