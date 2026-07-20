import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { eventParticipants, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin } from "@/lib/security";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; participantId: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr, participantId: pidStr } = await params;
    const eventId = Number(idStr);
    const participantId = Number(pidStr);

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");
    if (event.hostId !== user.id && user.role !== "admin") throw new Error("僅揪主可管理報名名單");

    const [participant] = await db.select().from(eventParticipants).where(eq(eventParticipants.id, participantId)).limit(1);
    if (!participant || participant.eventId !== eventId) throw new Error("找不到報名紀錄");

    const body = await req.json().catch(() => null);
    const action = String(body?.action || "");

    const actionMap: Record<string, { status?: string; attended?: boolean; notifyTitle: string }> = {
      approve: { status: "approved", notifyTitle: "您的報名已通過審核" },
      reject: { status: "rejected", notifyTitle: "您的報名申請未通過" },
      waitlist: { status: "waitlist", notifyTitle: "您已被移至候補名單" },
      attended: { attended: true, notifyTitle: "揪主已標記您出席此活動" },
      absent: { attended: false, notifyTitle: "揪主已標記您未出席此活動" },
    };
    const config = actionMap[action];
    if (!config) throw new Error("不支援的操作");

    const updates: Record<string, unknown> = {};
    if (config.status) updates.status = config.status;
    if (config.attended !== undefined) updates.attended = config.attended;

    await db.update(eventParticipants).set(updates).where(eq(eventParticipants.id, participantId));

    await notify({
      userId: participant.userId,
      type: "participant_status",
      title: config.notifyTitle,
      content: `活動：「${event.title}」`,
      link: `/events/${eventId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
