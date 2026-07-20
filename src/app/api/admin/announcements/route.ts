import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { siteAnnouncements, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse, logAdminAction } from "@/lib/api";
import { notifyMany } from "@/lib/notify";
import { sanitize } from "@/lib/security";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(siteAnnouncements).orderBy(desc(siteAnnouncements.createdAt));
    return NextResponse.json({ announcements: rows });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const title = sanitize(String(body?.title || ""), 150);
    const content = sanitize(String(body?.content || ""), 2000);
    if (!title || !content) throw new Error("請輸入標題與內容");

    const [announcement] = await db.insert(siteAnnouncements).values({ title, content, createdBy: admin.id }).returning();

    const allUsers = await db.select({ id: users.id }).from(users);
    await notifyMany(allUsers.map((u) => u.id), { type: "site_announcement", title: `📢 ${title}`, content });
    await logAdminAction(admin.id, "發送全站公告", "site_announcement", announcement.id, title);

    return NextResponse.json({ ok: true, announcement });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) throw new Error("缺少 ID");
    await db.update(siteAnnouncements).set({ isActive: false }).where(eq(siteAnnouncements.id, id));
    await logAdminAction(admin.id, "下架全站公告", "site_announcement", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
