import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  getSessionCookieOptions,
  normalizeEmail,
  SESSION_COOKIE,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ message: "請輸入 email 與密碼" }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, passwordHash: users.passwordHash, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || user.status === "suspended" || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ message: user?.status === "suspended" ? "此帳號目前已被停權" : "Email 或密碼不正確" }, { status: 401 });
    }

    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
    response.cookies.set(SESSION_COOKIE, session.token, {
      ...getSessionCookieOptions(),
      expires: session.expiresAt,
    });
    return response;
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    console.error("[auth/login] database error", error);
    if (process.env.NODE_ENV !== "production") {
      const developmentMessage: Record<string, string> = {
        ECONNREFUSED: "PostgreSQL 尚未啟動，請到 services.msc 啟動 PostgreSQL 服務",
        "28P01": "PostgreSQL 帳號或密碼錯誤，請檢查 .env 的 DATABASE_URL",
        "3D000": "找不到 app_db 資料庫，請在 pgAdmin 建立 app_db",
        "42P01": "找不到 users 或 sessions 資料表，請先執行 npx.cmd drizzle-kit push",
        "42703": "資料表欄位與目前程式不一致，請先執行 npx.cmd drizzle-kit push",
      };
      return NextResponse.json({ message: developmentMessage[code] ?? `資料庫登入錯誤（${code || "unknown"}），請查看 VS Code 終端機` }, { status: 500 });
    }
    return NextResponse.json({ message: "目前無法登入，請稍後再試" }, { status: 500 });
  }
}
