import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { honorItems, honorOwnerships, honorTransactions, users } from "@/db/schema";
import { errorResponse, logAdminAction } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const items = await db.select({ id: honorItems.id, name: honorItems.name, type: honorItems.type, price: honorItems.price, soldQuantity: honorItems.soldQuantity, limitQuantity: honorItems.limitQuantity, isActive: honorItems.isActive, owners: sql<number>`count(${honorOwnerships.id})` }).from(honorItems).leftJoin(honorOwnerships, eq(honorOwnerships.itemId, honorItems.id)).groupBy(honorItems.id).orderBy(desc(honorItems.createdAt));
    const revenue = await db.select({ total: sql<number>`coalesce(sum(-${honorTransactions.amount}), 0)` }).from(honorTransactions).where(eq(honorTransactions.type, "purchase"));
    return NextResponse.json({ items, revenue: Number(revenue[0]?.total ?? 0) });
  } catch (err) { return errorResponse(err); }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "grant") {
      const userId = Number(body.userId); const itemId = Number(body.itemId); if (!userId || !itemId) throw new Error("請提供使用者與商品");
      await db.transaction(async (tx) => { await tx.insert(honorOwnerships).values({ userId, itemId, source: "grant", sourceRef: `admin:${admin.id}` }); const wallet = (await tx.select({ jCoins: users.jCoins }).from(users).where(eq(users.id, userId)).limit(1))[0]?.jCoins ?? 0; await tx.insert(honorTransactions).values({ userId, itemId, type: "grant", actorId: admin.id, balanceAfter: wallet, reason: String(body.reason || "管理員授予") }); });
      await logAdminAction(admin.id, "honor_grant", "honor_item", itemId, `授予使用者 ${userId}：${String(body.reason || "管理員授予")}`);
      return NextResponse.json({ message: "已授予收藏" });
    }
    const type = String(body.type || "frame"); if (!["frame", "title", "badge"].includes(type) || !body.name || !body.description) throw new Error("請完整填寫名稱、類型與介紹");
    const [item] = await db.insert(honorItems).values({ name: String(body.name), subtitle: String(body.subtitle || ""), description: String(body.description), story: String(body.story || ""), type, price: Math.max(0, Number(body.price || 0)), rewardBonusPercent: Math.max(0, Math.min(30, Number(body.rewardBonusPercent || 0))), isFree: Boolean(body.isFree), isPurchasable: true, effectConfig: { theme: String(body.theme || "sensory"), particleCount: Number(body.particleCount || 18), animationDuration: Number(body.animationDuration || 2.4) }, createdBy: admin.id }).returning({ id: honorItems.id });
    await logAdminAction(admin.id, "honor_create", "honor_item", item.id, String(body.name));
    return NextResponse.json({ id: item.id, message: "已建立商品" });
  } catch (err) { return errorResponse(err); }
}
