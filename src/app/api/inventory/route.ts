import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userInventory, shopItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    
    const inventory = await db
      .select({
        id: userInventory.id,
        itemId: shopItems.id,
        name: shopItems.name,
        type: shopItems.type,
        rarity: shopItems.rarity,
        metadata: shopItems.metadata,
        isEquipped: userInventory.isEquipped,
        purchasedAt: userInventory.purchasedAt,
      })
      .from(userInventory)
      .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
      .where(eq(userInventory.userId, user.id));

    return NextResponse.json({ inventory });
  } catch (err) {
    return errorResponse(err);
  }
}
