import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accountAppeals, users, blacklist } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin } from "@/lib/security";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: accountAppeals.id,
        type: accountAppeals.type,
        message: accountAppeals.message,
        status: accountAppeals.status,
        createdAt: accountAppeals.createdAt,
        userId: accountAppeals.userId,
        userName: users.name,
        userEmail: users.email,
        userStatus: users.status,
        userSuspendReason: users.suspendReason,
        userIsBlacklisted: users.isBlacklisted,
      })
      .from(accountAppeals)
      .leftJoin(users, eq(accountAppeals.userId, users.id))
      .orderBy(desc(accountAppeals.createdAt));
    return NextResponse.json({ appeals: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const id = Number(body?.id);
    const action = String(body?.action || "");
    if (!id) throw new Error("缺少 ID");

    const [appeal] = await db.select().from(accountAppeals).where(eq(accountAppeals.id, id)).limit(1);
    if (!appeal) throw new Error("找不到申訴紀錄");
    if (appeal.status !== "pending") throw new Error("此申訴已審核過");

    if (action === "approve") {
      await db.update(accountAppeals).set({ status: "resolved", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(accountAppeals.id, id));
      if (appeal.type === "suspend") {
        await db.update(users).set({ status: "active", suspendReason: null }).where(eq(users.id, appeal.userId));
      } else {
        await db.update(users).set({ isBlacklisted: false }).where(eq(users.id, appeal.userId));
        await db.update(blacklist).set({ active: false }).where(eq(blacklist.userId, appeal.userId));
      }
      await notify({
        userId: appeal.userId,
        type: "appeal_approved",
        title: "申訴已通過",
        content: appeal.type === "suspend" ? "您的帳號已恢復正常使用。" : "您已被移出黑名單。",
      });
      await logAdminAction(admin.id, "核准帳號申訴", "account_appeal", id, appeal.type);
    } else if (action === "reject") {
      await db.update(accountAppeals).set({ status: "rejected", reviewedBy: admin.id, reviewedAt: new Date() }).where(eq(accountAppeals.id, id));
      await notify({ userId: appeal.userId, type: "appeal_rejected", title: "申訴未通過", content: "經審核後，您的申訴維持原處分。" });
      await logAdminAction(admin.id, "駁回帳號申訴", "account_appeal", id, appeal.type);
    } else {
      throw new Error("不支援的操作");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
