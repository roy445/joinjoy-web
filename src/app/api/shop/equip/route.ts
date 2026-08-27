import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, shopItems, userInventory } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { itemId, action } = await req.json(); // action: 'equip' | 'unequip'

    if (!itemId) throw new Error("未指定項目");

    // 1. Verify ownership
    const [owned] = await db
      .select({
        inventoryId: userInventory.id,
        itemType: shopItems.type,
        itemName: shopItems.name,
      })
      .from(userInventory)
      .innerJoin(shopItems, eq(userInventory.itemId, shopItems.id))
      .where(and(eq(userInventory.userId, user.id), eq(userInventory.itemId, itemId)))
      .limit(1);

    if (!owned) throw new Error("您尚未擁有此項目");

    // 2. Update user profile based on item type
    const fieldMap: Record<string, string> = {
      title: "activeTitle",
      frame: "activeAvatarFrame",
      badge: "activeBadge",
    };

    const field = fieldMap[owned.itemType];
    if (!field) throw new Error("不支援裝備此類型的項目");

    const updates: any = {};
    if (action === "unequip") {
      updates[field] = null;
    } else {
      updates[field] = owned.itemName;
    }

    await db.transaction(async (tx) => {
      // Set all items of the same type to not equipped in inventory
      // (Optional: depending on whether we want to track equipment in inventory table too)
      await tx
        .update(userInventory)
        .set({ isEquipped: false })
        .where(
          and(
            eq(userInventory.userId, user.id),
            sql`${userInventory.itemId} IN (SELECT id FROM ${shopItems} WHERE type = ${owned.itemType})`
          )
        );

      if (action !== "unequip") {
        await tx
          .update(userInventory)
          .set({ isEquipped: true })
          .where(eq(userInventory.id, owned.inventoryId));
      }

      // Update user table for quick visual access
      await tx.update(users).set(updates).where(eq(users.id, user.id));
    });

    return NextResponse.json({ ok: true, message: action === "unequip" ? "已卸下" : "裝備成功！" });
  } catch (err) {
    return errorResponse(err);
  }
}
