import { NextResponse } from "next/server";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { honorEquipments, honorItems, honorOwnerships, honorTransactions, users } from "@/db/schema";
import { errorResponse } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const seedItems = [
  { name: "超感視覺", subtitle: "粒子與流光交織的動態頭像框", description: "讓你的頭像被漂浮粒子與柔和流光包圍，點擊即可進入全螢幕預覽。", story: "在 JoinJoy 宇宙裡，感受每一次相遇留下的光。", type: "frame", price: 360, rewardBonusPercent: 5, isFeatured: true, effectConfig: { theme: "sensory", accent: "#49c9ba", particleCount: 22, animationDuration: 3.2 } },
  { name: "晨霧漫遊", subtitle: "在柔霧裡遇見好咖", description: "呼吸光與漂浮微光點，為你的個人頁帶來安靜的晨霧氛圍。", story: "有些旅程不需要急著抵達。", type: "frame", price: 180, rewardBonusPercent: 2, effectConfig: { theme: "mist", accent: "#8fd5c6", particleCount: 10, animationDuration: 2.6 } },
  { name: "星河旅途", subtitle: "把相遇寫進銀河", description: "銀河軌跡環繞頭像，適合喜歡夜色與遠方的你。", story: "每一次出發，都會遇見新的星星。", type: "frame", price: 720, rewardBonusPercent: 8, effectConfig: { theme: "galaxy", accent: "#9b8cff", particleCount: 30, animationDuration: 2.4 } },
  { name: "溫柔發起者", subtitle: "稱號 · 讓大家都自在", description: "帶有柔和漸層與微光掃過的文字稱號。", story: "真正的揪團，是讓每個人都有位置。", type: "title", price: 120, rewardBonusPercent: 2, effectConfig: { theme: "soft", accent: "#e58a68", animationDuration: 2.2 } },
  { name: "夜行觀察家", subtitle: "稱號 · 總能找到小眾風景", description: "深色漸層字體搭配細緻光線流動效果。", story: "你看見別人錯過的風景。", type: "title", price: 260, rewardBonusPercent: 4, effectConfig: { theme: "night", accent: "#6d9dff", animationDuration: 2.1 } },
  { name: "好咖星標", subtitle: "徽章 · 可靠的同行者", description: "小型星標徽章，帶有旋轉、閃耀與呼吸光。", story: "可靠，不是永遠準時，而是願意好好出現。", type: "badge", price: 80, rewardBonusPercent: 1, effectConfig: { theme: "star", accent: "#f6bd54", particleCount: 6, animationDuration: 1.8 } },
];

async function ensureHonorSeed() {
  const existing = await db.select({ id: honorItems.id }).from(honorItems).limit(1);
  if (existing.length === 0) await db.insert(honorItems).values(seedItems as typeof honorItems.$inferInsert[]);
}

function serializeItem(item: typeof honorItems.$inferSelect, owned: boolean, equipped: boolean, ownership?: typeof honorOwnerships.$inferSelect) {
  const now = Date.now();
  const saleActive = (!item.startsAt || item.startsAt.getTime() <= now) && (!item.endsAt || item.endsAt.getTime() > now);
  const soldOut = item.isLimited && item.limitQuantity !== null && item.soldQuantity >= item.limitQuantity;
  const remaining = item.isLimited && item.limitQuantity !== null ? Math.max(0, item.limitQuantity - item.soldQuantity) : null;
  const useExpired = Boolean(ownership?.expiresAt && ownership.expiresAt.getTime() <= now);
  return { ...item, owned: owned && !useExpired, equipped: equipped && !useExpired, saleActive, soldOut, remaining, useExpired, ownershipExpiresAt: ownership?.expiresAt ?? null };
}

export async function GET() {
  try {
    await ensureHonorSeed();
    const user = await (async () => { try { return await requireUser(); } catch { return null; } })();
    const items = await db.select().from(honorItems).where(eq(honorItems.isActive, true)).orderBy(desc(honorItems.isFeatured), desc(honorItems.createdAt));
    if (!user) return NextResponse.json({ items: items.map((item) => serializeItem(item, false, false)), jCoins: null, maxRewardBonusPercent: 30 });
    const [ownerships, equipments, wallet] = await Promise.all([
      db.select().from(honorOwnerships).where(and(eq(honorOwnerships.userId, user.id), isNull(honorOwnerships.revokedAt))),
      db.select().from(honorEquipments).where(eq(honorEquipments.userId, user.id)),
      db.select({ jCoins: users.jCoins }).from(users).where(eq(users.id, user.id)).limit(1),
    ]);
    return NextResponse.json({ items: items.map((item) => { const own = ownerships.find((o) => o.itemId === item.id); return serializeItem(item, Boolean(own), equipments.some((e) => e.itemId === item.id), own); }), jCoins: wallet[0]?.jCoins ?? 0, maxRewardBonusPercent: 30 });
  } catch (err) { return errorResponse(err); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json() as { action?: string; itemId?: number };
    if (!body.itemId || !["purchase", "equip", "unequip"].includes(body.action ?? "")) throw new Error("無效的商城操作");
    const itemId = body.itemId;
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`);
      const item = (await tx.select().from(honorItems).where(eq(honorItems.id, itemId)).limit(1))[0];
      if (!item || !item.isActive) throw new Error("商品不存在或已下架");
      if (body.action === "equip" || body.action === "unequip") {
        const own = (await tx.select().from(honorOwnerships).where(and(eq(honorOwnerships.itemId, item.id), eq(honorOwnerships.userId, user.id), isNull(honorOwnerships.revokedAt))).limit(1))[0];
        if (body.action === "equip") {
          if (!own || (own.expiresAt && own.expiresAt <= new Date())) throw new Error("你尚未擁有這件收藏");
          await tx.delete(honorEquipments).where(and(eq(honorEquipments.userId, user.id), eq(honorEquipments.type, item.type)));
          await tx.insert(honorEquipments).values({ userId: user.id, type: item.type, itemId: item.id });
          await tx.insert(honorTransactions).values({ userId: user.id, itemId: item.id, type: "equip", balanceAfter: (await tx.select({ jCoins: users.jCoins }).from(users).where(eq(users.id, user.id)).limit(1))[0]?.jCoins ?? 0 });
          return { message: "已裝備" };
        }
        await tx.delete(honorEquipments).where(and(eq(honorEquipments.userId, user.id), eq(honorEquipments.type, item.type), eq(honorEquipments.itemId, item.id)));
        const balance = (await tx.select({ jCoins: users.jCoins }).from(users).where(eq(users.id, user.id)).limit(1))[0]?.jCoins ?? 0;
        await tx.insert(honorTransactions).values({ userId: user.id, itemId: item.id, type: "unequip", balanceAfter: balance });
        return { message: "已卸下" };
      }
      const existing = await tx.select().from(honorOwnerships).where(and(eq(honorOwnerships.itemId, item.id), eq(honorOwnerships.userId, user.id), isNull(honorOwnerships.revokedAt))).limit(1);
      if (existing.length && !item.allowDuplicate) throw new Error("你已經收藏這件商品");
      const now = new Date();
      if (!item.isFree && !item.isPurchasable) throw new Error("這件商品目前不可購買");
      if (item.startsAt && item.startsAt > now) throw new Error("商品尚未開始販售");
      if (item.endsAt && item.endsAt <= now) throw new Error("商品已停止販售");
      if (item.isLimited && item.limitQuantity !== null && item.soldQuantity >= item.limitQuantity) throw new Error("商品已售罄");
      const wallet = (await tx.select({ jCoins: users.jCoins }).from(users).where(eq(users.id, user.id)).limit(1))[0];
      const price = item.isFree ? 0 : item.price;
      if (!wallet || wallet.jCoins < price) throw new Error(`J幣不足，還需要 ${price - (wallet?.jCoins ?? 0)} J幣`);
      const balanceUpdate = await tx.update(users).set({ jCoins: sql`${users.jCoins} - ${price}` }).where(and(eq(users.id, user.id), gt(users.jCoins, price - 1))).returning({ jCoins: users.jCoins });
      if (!balanceUpdate.length) throw new Error("J幣不足或交易已失效，請重新整理");
      const balanceAfter = balanceUpdate[0].jCoins;
      if (item.isLimited) {
        const updated = await tx.update(honorItems).set({ soldQuantity: sql`${honorItems.soldQuantity} + 1` }).where(and(eq(honorItems.id, item.id), or(eq(honorItems.isLimited, false), lt(honorItems.soldQuantity, item.limitQuantity ?? 0)))).returning({ id: honorItems.id });
        if (!updated.length) throw new Error("商品剛剛售罄，請重新整理");
      }
      const expiresAt = item.isTimeLimitedUse && item.endsAt ? item.endsAt : null;
      await tx.insert(honorOwnerships).values({ userId: user.id, itemId: item.id, source: "purchase", expiresAt });
      await tx.insert(honorTransactions).values({ userId: user.id, itemId: item.id, type: "purchase", amount: -price, balanceAfter, metadata: { itemName: item.name } });
      return { message: price ? `購買成功，已扣除 ${price} J幣` : "已加入收藏" };
    });
    return NextResponse.json(result);
  } catch (err) { return errorResponse(err); }
}
