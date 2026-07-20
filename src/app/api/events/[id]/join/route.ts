import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { events, eventParticipants, users } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { notify } from "@/lib/notify";
import { isSameOrigin, rateLimit, clientKey } from "@/lib/security";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);
    if (!rateLimit(clientKey(req, `join-${user.id}`), 20, 10 * 60 * 1000)) throw new Error("操作太頻繁，請稍後再試");

    const body = await req.json().catch(() => ({}));
    if (!body.agreePolicy) {
      throw new Error("請詳閱並勾選報名須知：無故未出席或違規將可能被列入黑名單或封鎖帳號");
    }

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");
    if (event.status === "cancelled") throw new Error("此活動已取消，無法報名");
    if (event.status === "completed") throw new Error("此活動已結束");
    if (event.hostId === user.id) throw new Error("您是此活動的揪主，無需報名");

    const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (event.genderLimit !== "any" && profile.gender && profile.gender !== event.genderLimit) {
      throw new Error("此活動有性別限制，您的個人資料設定不符合報名條件");
    }
    if ((event.ageMin || event.ageMax) && profile.age) {
      if (event.ageMin && profile.age < event.ageMin) throw new Error(`此活動要求年齡需滿 ${event.ageMin} 歲`);
      if (event.ageMax && profile.age > event.ageMax) throw new Error(`此活動要求年齡上限為 ${event.ageMax} 歲`);
    }

    const [existing] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id)))
      .limit(1);
    if (existing && ["pending", "approved", "waitlist"].includes(existing.status)) {
      throw new Error("您已經報名此活動了");
    }

    const plusOneCount = event.allowPlusOne ? Math.max(0, Math.min(3, Number(body.plusOneCount) || 0)) : 0;

    const approvedCount = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "approved")));

    let status: "pending" | "approved" | "waitlist" = "approved";
    if (event.requireApproval) status = "pending";
    else if (approvedCount.length + 1 + plusOneCount > event.capacity) {
      if (!event.allowWaitlist) throw new Error("名額已滿，此活動不開放候補");
      status = "waitlist";
    }

    if (existing) {
      await db.update(eventParticipants).set({ status, plusOneCount, joinedAt: new Date() }).where(eq(eventParticipants.id, existing.id));
    } else {
      await db.insert(eventParticipants).values({ eventId, userId: user.id, status, plusOneCount });
    }

    await notify({
      userId: event.hostId,
      type: "event_join",
      title: status === "pending" ? "有人申請加入活動" : "有新成員加入活動",
      content: `${user.name} ${status === "pending" ? "申請加入" : "加入了"}「${event.title}」`,
      link: `/events/${eventId}`,
    });

    const messages: Record<string, string> = {
      pending: "已送出申請，請等候揪主審核",
      approved: "報名成功！記得準時出席喔",
      waitlist: "目前名額已滿，已為您加入候補名單",
    };

    return NextResponse.json({ ok: true, status, message: messages[status] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const eventId = Number(idStr);

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new Error("找不到活動");

    const [existing] = await db
      .select()
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.userId, user.id)))
      .limit(1);
    if (!existing) throw new Error("您尚未報名此活動");

    const wasApproved = existing.status === "approved";
    await db.update(eventParticipants).set({ status: "cancelled" }).where(eq(eventParticipants.id, existing.id));

    if (wasApproved) {
      const [nextWaitlist] = await db
        .select()
        .from(eventParticipants)
        .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "waitlist")))
        .orderBy(asc(eventParticipants.joinedAt))
        .limit(1);
      if (nextWaitlist) {
        await db.update(eventParticipants).set({ status: "approved" }).where(eq(eventParticipants.id, nextWaitlist.id));
        await notify({
          userId: nextWaitlist.userId,
          type: "waitlist_promoted",
          title: "候補遞補成功",
          content: `「${event.title}」有名額釋出，您已遞補成功！`,
          link: `/events/${eventId}`,
        });
      }
    }

    await notify({
      userId: event.hostId,
      type: "event_leave",
      title: "有成員退出活動",
      content: `${user.name} 退出了「${event.title}」`,
      link: `/events/${eventId}`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
