import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, shopItems, userInventory } from "@/db/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  const items = await db.select().from(shopItems).where(eq(shopItems.isActive, true));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { itemId } = await req.json();

    if (!itemId) throw new Error("請選擇商品");

    const [item] = await db.select().from(shopItems).where(eq(shopItems.id, itemId)).limit(1);
    if (!item) throw new Error("找不到該商品");
    if (!item.isActive) throw new Error("該商品已下架");

    const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!profile) throw new Error("找不到使用者資訊");

    if ((profile.jCoins || 0) < item.price) {
      throw new Error(`J-幣不足！還差 ${item.price - (profile.jCoins || 0)} 幣`);
    }

    // Check if already owned
    const [owned] = await db
      .select()
      .from(userInventory)
      .where(and(eq(userInventory.userId, user.id), eq(userInventory.itemId, itemId)))
      .limit(1);
    
    if (owned) throw new Error("您已經擁有這項商品了");

    // Transaction: deduct coins and add to inventory
    let balanceAfter = profile.jCoins || 0;
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`);
      const [updated] = await tx.update(users).set({ jCoins: sql`${users.jCoins} - ${item.price}` }).where(and(eq(users.id, user.id), gt(users.jCoins, item.price - 1))).returning({ jCoins: users.jCoins });
      if (!updated) throw new Error("J-幣不足或交易已失效，請重新整理");
      balanceAfter = updated.jCoins;

      await tx.insert(userInventory).values({
        userId: user.id,
        itemId: itemId,
        isEquipped: false,
      });
    });

    return NextResponse.json({ ok: true, message: `成功兌換 ${item.name}！`, jCoins: balanceAfter, itemId: item.id });
  } catch (err) {
    return errorResponse(err);
  }
}
