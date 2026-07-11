import { and, eq, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getCurrentUser, hashPassword, hashSessionToken, SESSION_COOKIE, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const body = (await request.json()) as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || newPassword.length < 8) return NextResponse.json({ message: "請輸入目前密碼，新密碼至少需要 8 個字元" }, { status: 400 });

    const [record] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!record || !(await verifyPassword(currentPassword, record.passwordHash))) return NextResponse.json({ message: "目前密碼不正確" }, { status: 400 });
    if (currentPassword === newPassword) return NextResponse.json({ message: "新密碼不能和目前密碼相同" }, { status: 400 });

    await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
    await db.delete(sessions).where(currentToken ? and(eq(sessions.userId, user.id), ne(sessions.tokenHash, hashSessionToken(currentToken))) : eq(sessions.userId, user.id));
    return NextResponse.json({ ok: true, message: "密碼已更新，其他裝置已登出" });
  } catch (error) {
    console.error("[auth/change-password] error", error);
    return NextResponse.json({ message: "密碼更新失敗" }, { status: 500 });
  }
}
