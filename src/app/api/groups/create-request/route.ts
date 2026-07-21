import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { createGroupRequests, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, rateLimit, clientKey, isSameOrigin } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(createGroupRequests)
      .where(eq(createGroupRequests.userId, user.id))
      .orderBy(desc(createGroupRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `group-create-request-${user.id}`), 3, 60 * 60 * 1000)) {
      throw new Error("申請太頻繁，請稍後再試");
    }
    const [pending] = await db
      .select({ id: createGroupRequests.id })
      .from(createGroupRequests)
      .where(and(eq(createGroupRequests.userId, user.id), eq(createGroupRequests.status, "pending")))
      .limit(1);
    if (pending) throw new Error("您已有一筆申請正在審核中，請耐心等候");

    const body = await req.json().catch(() => null);
    const reason = sanitize(String(body?.reason || ""), 1000);
    if (reason.length < 5) throw new Error("請簡述申請原因（至少 5 個字）");

    const [request] = await db.insert(createGroupRequests).values({ userId: user.id, reason }).returning();

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await notifyMany(admins.map((a) => a.id), {
      type: "admin_group_request",
      title: "新的建立社團申請",
      content: `${user.name} 提出建立社團權限申請，請至管理後台審核。`,
      link: "/admin/group-requests",
    });

    return NextResponse.json({ ok: true, request });
  } catch (err) {
    return errorResponse(err);
  }
}