import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
  }
  if (!rateLimit(clientKey(req, "login"), 12, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "登入嘗試太頻繁，請稍後再試" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "格式錯誤" }, { status: 400 });

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "帳號或密碼錯誤" }, { status: 401 });
  }

  // Suspended users are still allowed to log in so they can view their account
  // status and submit an appeal from the settings page; further actions remain
  // blocked by requireUser() checks throughout the API.
  await createSession(user.id);
  if (user.status === "suspended") {
    return NextResponse.json({
      ok: true,
      warning: `您的帳號已被停權：${user.suspendReason || "違反平台規範"}。您仍可登入查看帳號狀態並提出申訴。`,
    });
  }
  return NextResponse.json({ ok: true });
}
