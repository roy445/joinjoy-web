import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { blacklistRequests, users, events } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, isSameOrigin, rateLimit, clientKey } from "@/lib/security";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({
        id: blacklistRequests.id,
        reason: blacklistRequests.reason,
        description: blacklistRequests.description,
        status: blacklistRequests.status,
        createdAt: blacklistRequests.createdAt,
        targetUserId: blacklistRequests.targetUserId,
        targetName: users.name,
        eventId: blacklistRequests.eventId,
      })
      .from(blacklistRequests)
      .leftJoin(users, eq(blacklistRequests.targetUserId, users.id))
      .where(eq(blacklistRequests.hostId, user.id))
      .orderBy(desc(blacklistRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `blacklist-req-${user.id}`), 5, 60 * 60 * 1000)) throw new Error("申請太頻繁，請稍後再試");

    const body = await req.json().catch(() => null);
    const targetUserId = Number(body?.targetUserId);
    const reason = sanitize(String(body?.reason || ""), 150);
    const description = sanitize(String(body?.description || ""), 3000);
    const eventId = body?.eventId ? Number(body.eventId) : null;
    const evidenceUrls = Array.isArray(body?.evidenceUrls) ? body.evidenceUrls.slice(0, 6) : [];

    if (!targetUserId) throw new Error("請選擇要申請黑名單的使用者");
    if (targetUserId === user.id) throw new Error("無法申請將自己列入黑名單");
    if (!reason) throw new Error("請選擇原因");
    if (description.length < 10) throw new Error("請詳述事情經過（至少 10 個字）");

    if (eventId) {
      const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
      if (!event || event.hostId !== user.id) throw new Error("僅該場活動的揪主可提出申請");
    }

    const [request] = await db.insert(blacklistRequests).values({ hostId: user.id, targetUserId, eventId, reason, description, evidenceUrls }).returning();

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await notifyMany(admins.map((a) => a.id), {
      type: "admin_blacklist_request",
      title: "收到黑名單申請",
      content: `揪主 ${user.name} 申請將使用者列入黑名單：${reason}`,
      link: "/admin/blacklist",
    });

    return NextResponse.json({ ok: true, request });
  } catch (err) {
    return errorResponse(err);
  }
}
