import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { generateInviteCode, isSameOrigin, rateLimit, clientKey } from "@/lib/security";

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateInviteCode();
    const [existing] = await db.select({ id: groups.id }).from(groups).where(eq(groups.inviteCode, code)).limit(1);
    if (!existing) return code;
  }
  throw new Error("代碼產生失敗，請再試一次");
}

// Regenerating the invite code immediately invalidates the old one, since
// group.inviteCode is a single unique column rather than a redeemable list.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    if (!rateLimit(clientKey(req, `regen-code-${user.id}`), 10, 60 * 60 * 1000)) {
      throw new Error("操作太頻繁，請稍後再試");
    }
    const { id: idStr } = await params;
    const groupId = Number(idStr);
    const [group] = await db.select().from(groups).where(eq(groups.id, groupId)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId !== user.id && user.role !== "admin") throw new Error("僅社團建立者可重新產生邀請代碼");

    const inviteCode = await createUniqueInviteCode();
    await db.update(groups).set({ inviteCode, updatedAt: new Date() }).where(eq(groups.id, groupId));

    if (user.role === "admin" && group.ownerId !== user.id) {
      await logAdminAction(user.id, "重新產生社團邀請代碼", "group", groupId, group.name);
    }

    return NextResponse.json({ ok: true, inviteCode });
  } catch (err) {
    return errorResponse(err);
  }
}