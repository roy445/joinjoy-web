import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, generateToken, AuthError } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";
import { sendVerificationEmail } from "@/lib/mail";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await getCurrentUser();
    if (!user) throw new AuthError("請先登入");
    if (!rateLimit(clientKey(req, `resend-verify-${user.id}`), 5, 15 * 60 * 1000)) {
      throw new Error("請求太頻繁，請稍後再試");
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(emailVerificationTokens).values({ userId: user.id, token, expiresAt });
    const verifyUrl = new URL(`/verify-email?token=${token}`, req.nextUrl.origin).toString();
    const result = await sendVerificationEmail(user.email, user.name, verifyUrl);

    return NextResponse.json({
      ok: true,
      emailSent: result.sent,
      devVerifyUrl: result.sent ? undefined : verifyUrl,
    });
  } catch (err) {
    return errorResponse(err);
  }
}