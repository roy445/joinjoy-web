import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers, users } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { sanitize, isSameOrigin } from "@/lib/security";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (Number.isNaN(id)) return NextResponse.json({ error: "找不到社團" }, { status: 404 });

  const [group] = await db
    .select({ group: groups, ownerName: users.name, ownerAvatar: users.avatarUrl })
    .from(groups)
    .leftJoin(users, eq(groups.ownerId, users.id))
    .where(eq(groups.id, id))
    .limit(1);
  if (!group) return NextResponse.json({ error: "找不到社團" }, { status: 404 });

  const [{ count: memberCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, id), eq(groupMembers.status, "approved")));

  const currentUser = await getCurrentUser();
  let myMembership = null;
  const isOwner = currentUser?.id === group.group.ownerId;
  const isAdmin = currentUser?.role === "admin";

  if (currentUser) {
    const [m] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, currentUser.id)))
      .limit(1);
    myMembership = m ?? null;
  }

  const isApprovedMember = isOwner || isAdmin || myMembership?.status === "approved";

  let members: any[] = [];
  let pendingMembers: any[] = [];
  if (isApprovedMember) {
    const rows = await db
      .select({
        id: groupMembers.id,
        userId: groupMembers.userId,
        role: groupMembers.role,
        status: groupMembers.status,
        joinedAt: groupMembers.joinedAt,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(groupMembers)
      .leftJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.groupId, id));
    members = rows.filter((r) => r.status === "approved");
    pendingMembers = isOwner || isAdmin ? rows.filter((r) => r.status === "pending") : [];
  }

  // The invite code is sensitive — only expose it to approved members (who
  // can use it to invite friends) and never to outside visitors.
  const { inviteCode, ...publicGroupFields } = group.group;

  return NextResponse.json({
    group: isApprovedMember ? group.group : publicGroupFields,
    inviteCode: isApprovedMember ? inviteCode : null,
    ownerName: group.ownerName,
    ownerAvatar: group.ownerAvatar,
    memberCount: Number(memberCount),
    myMembership,
    isOwner,
    isAdmin,
    isApprovedMember,
    members,
    pendingMembers,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new Error("請求來源不正確");
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const [group] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId !== user.id && user.role !== "admin") throw new Error("沒有權限編輯此社團");

    const body = await req.json().catch(() => null);
    if (!body) throw new Error("格式錯誤");

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string") updates.name = sanitize(body.name, 100);
    if (typeof body.description === "string") updates.description = sanitize(body.description, 2000);
    if (typeof body.coverImageUrl === "string") updates.coverImageUrl = body.coverImageUrl;
    if (typeof body.isPrivate === "boolean") updates.isPrivate = body.isPrivate;

    await db.update(groups).set(updates).where(eq(groups.id, id));

    if (user.role === "admin" && group.ownerId !== user.id) {
      await logAdminAction(user.id, "編輯社團", "group", id, JSON.stringify(body));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: idStr } = await params;
    const id = Number(idStr);
    const [group] = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (!group) throw new Error("找不到社團");
    if (group.ownerId !== user.id && user.role !== "admin") throw new Error("沒有權限刪除此社團");

    await db.delete(groups).where(eq(groups.id, id));

    if (user.role === "admin" && group.ownerId !== user.id) {
      await logAdminAction(user.id, "刪除社團", "group", id, group.name);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}