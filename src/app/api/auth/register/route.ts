import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  getSessionCookieOptions,
  hashPassword,
  normalizeEmail,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown; password?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ message: "暱稱請輸入 2–80 個字元" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "請輸入有效的 email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "密碼至少需要 8 個字元" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

    if (!user) {
      return NextResponse.json({ message: "註冊失敗，請稍後再試" }, { status: 500 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...getSessionCookieOptions(),
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    console.error("[auth/register] database error", error);
    if (code === "23505") {
      return NextResponse.json({ message: "這個 email 已經註冊過了" }, { status: 409 });
    }
    if (process.env.NODE_ENV !== "production") {
      const developmentMessage: Record<string, string> = {
        ECONNREFUSED: "PostgreSQL 尚未啟動，請到 services.msc 啟動 PostgreSQL 服務",
        "28P01": "PostgreSQL 帳號或密碼錯誤，請檢查 .env 的 DATABASE_URL",
        "3D000": "找不到 app_db 資料庫，請在 pgAdmin 建立 app_db",
        "42P01": "找不到 users 資料表，請先執行 npx.cmd drizzle-kit push",
      };
      return NextResponse.json({ message: developmentMessage[code] ?? `資料庫註冊錯誤（${code || "unknown"}），請查看 VS Code 終端機` }, { status: 500 });
    }
    return NextResponse.json({ message: "目前無法註冊，請稍後再試" }, { status: 500 });
  }
}
