import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { accountAppeals, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, rateLimit, clientKey, isSameOrigin } from "@/lib/security";

// Appeals must work even for suspended users, so we don't use requireUser() (which blocks suspended accounts).
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("請先登入");
    const rows = await db.select().from(accountAppeals).where(eq(accountAppeals.userId, user.id)).orderBy(desc(accountAppeals.createdAt));
    return NextResponse.json({ appeals: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await getCurrentUser();
    if (!user) throw new Error("請先登入");
    if (!rateLimit(clientKey(req, `appeal-${user.id}`), 3, 60 * 60 * 1000)) {
      throw new Error("申訴太頻繁，請稍後再試");
    }

    const [pending] = await db
      .select({ id: accountAppeals.id })
      .from(accountAppeals)
      .where(eq(accountAppeals.userId, user.id))
      .orderBy(desc(accountAppeals.createdAt))
      .limit(1);

    const body = await req.json().catch(() => null);
    const type = body?.type === "blacklist" ? "blacklist" : "suspend";
    const message = sanitize(String(body?.message || ""), 1500);
    if (message.length < 10) throw new Error("請詳細說明您的申訴內容（至少 10 個字）");

    if (pending) {
      const [record] = await db.select().from(accountAppeals).where(eq(accountAppeals.id, pending.id)).limit(1);
      if (record?.status === "pending") throw new Error("您已有一筆申訴正在審核中，請耐心等候");
    }

    const [appeal] = await db.insert(accountAppeals).values({ userId: user.id, type, message }).returning();

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await notifyMany(admins.map((a) => a.id), {
      type: "admin_appeal",
      title: "收到帳號申訴",
      content: `${user.name} 提出${type === "blacklist" ? "黑名單" : "停權"}申訴，請至管理後台審核。`,
      link: "/admin/appeals",
    });

    return NextResponse.json({ ok: true, appeal });
  } catch (err) {
    return errorResponse(err);
  }
}
