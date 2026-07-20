import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import { getCurrentUser, hashPassword, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { isSameOrigin, rateLimit, clientKey } from "@/lib/security";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await getCurrentUser();
    if (!user) throw new Error("請先登入");
    if (!rateLimit(clientKey(req, `change-pw-${user.id}`), 8, 15 * 60 * 1000)) {
      throw new Error("嘗試次數過多，請稍後再試");
    }

    const body = await req.json().catch(() => null);
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    if (newPassword.length < 8) throw new Error("新密碼至少需要 8 個字元");

    const [full] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!full?.passwordHash || !verifyPassword(currentPassword, full.passwordHash)) {
      throw new Error("目前密碼不正確");
    }

    await db.update(users).set({ passwordHash: hashPassword(newPassword), updatedAt: new Date() }).where(eq(users.id, user.id));

    // Invalidate other sessions but keep the current one active.
    const cookieStore = await cookies();
    const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (currentToken) {
      await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.token, currentToken)));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
