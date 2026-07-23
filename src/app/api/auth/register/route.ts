import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";
import { isValidEmail, sanitizeText } from "@/lib/utils";
import { rateLimit, clientKey, isSameOrigin } from "@/lib/security";

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

  return NextResponse.json({ ok: true });
}