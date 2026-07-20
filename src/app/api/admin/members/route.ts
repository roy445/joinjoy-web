import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, ilike, or } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const q = req.nextUrl.searchParams.get("q");
    const rows = await db
      .select()
      .from(users)
      .where(q ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)) : undefined)
      .orderBy(desc(users.createdAt));
    return NextResponse.json({ members: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const userId = Number(body?.userId);
    const action = String(body?.action || "");
    if (!userId) throw new Error("缺少使用者 ID");

    const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new Error("找不到使用者");

    if (action === "suspend") {
      const reason = String(body?.reason || "違反平台規範");
      await db.update(users).set({ status: "suspended", suspendReason: reason }).where(eq(users.id, userId));
      await notify({ userId, type: "account_suspended", title: "帳號已被停權", content: reason });
      await logAdminAction(admin.id, "停權會員", "user", userId, reason);
    } else if (action === "unsuspend") {
      await db.update(users).set({ status: "active", suspendReason: null }).where(eq(users.id, userId));
      await notify({ userId, type: "account_restored", title: "帳號已恢復正常", content: "您的帳號已解除停權" });
      await logAdminAction(admin.id, "解除停權", "user", userId);
    } else if (action === "make_admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
      await logAdminAction(admin.id, "設為管理員", "user", userId);
    } else if (action === "grant_credit") {
      const { sql } = await import("drizzle-orm");
      await db.update(users).set({ eventCreateCredits: sql`${users.eventCreateCredits} + 1` }).where(eq(users.id, userId));
      await notify({ userId, type: "credit_granted", title: "獲得建立活動權限", content: "管理員已授予您 1 次建立活動的權限" });
      await logAdminAction(admin.id, "手動核發建立活動權限", "user", userId);
    } else {
      throw new Error("不支援的操作");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
