import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports, users, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize, isSameOrigin, rateLimit, clientKey } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    if (!rateLimit(clientKey(req, `report-${user.id}`), 6, 30 * 60 * 1000)) throw new Error("檢舉太頻繁，請稍後再試");

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");

    const body = await req.json().catch(() => null);
    const reason = sanitize(String(body?.reason || ""), 100);
    const description = sanitize(String(body?.description || ""), 1000);
    if (!reason) throw new Error("請選擇檢舉原因");

    const [report] = await db.insert(reports).values({
      type: body?.type === "comment" ? "comment" : body?.type === "chat" ? "chat" : "event",
      targetId: body?.targetId ? Number(body.targetId) : eventId,
      eventId,
      reporterId: user.id,
      reason,
      description,
    }).returning();

    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await notifyMany(admins.map((a) => a.id), {
      type: "admin_report",
      title: "收到新的檢舉案件",
      content: `${user.name} 檢舉了「${event.title}」：${reason}`,
      link: "/admin/reports",
    });

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    return errorResponse(err);
  }
}
