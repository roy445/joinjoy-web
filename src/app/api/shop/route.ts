import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, shopItems, userInventory } from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ jCoins: (profile.jCoins || 0) - item.price })
        .where(eq(users.id, user.id));

      await tx.insert(userInventory).values({
        userId: user.id,
        itemId: itemId,
        isEquipped: false,
      });
    });

    return NextResponse.json({ ok: true, message: `成功兌換 ${item.name}！` });
  } catch (err) {
    return errorResponse(err);
  }
}
