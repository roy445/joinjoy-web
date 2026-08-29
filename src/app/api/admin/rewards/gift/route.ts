import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  adminLogs,
  honorNotifications,
  jCoinTransactions,
  shopItems,
  userInventory,
  users,
} from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { clientKey, isSameOrigin, rateLimit, sanitize } from "@/lib/security";

const MAX_JCOINS = 100_000;
const MAX_REASON_LENGTH = 255;

class GiftInputError extends Error {}

function responseForError(error: unknown) {
  if (error instanceof GiftInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof AuthError) return errorResponse(error);
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: unknown }).code);
    if (code === "42P01" || code === "42703") {
      return NextResponse.json(
        { error: "贈送功能所需的資料表尚未完成設定，請先套用最新的資料庫 migration。", setupRequired: true },
        { status: 503 },
      );
    }
  }
  return errorResponse(error);
}

function positiveId(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new GiftInputError(`${label}不正確`);
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    }

    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-gift:${admin.id}`), 30, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as {
      userId?: unknown;
      giftType?: unknown;
      amount?: unknown;
      itemId?: unknown;
      reason?: unknown;
    } | null;

    const userId = positiveId(body?.userId, "使用者 ID");
    if (userId === admin.id) {
      throw new GiftInputError("為避免誤操作，請選擇其他使用者");
    }

    const giftType = body?.giftType === "item" ? "item" : body?.giftType === "jcoins" ? "jcoins" : "";
    if (!giftType) throw new GiftInputError("請選擇要贈送的類型");

    const reason = sanitize(String(body?.reason ?? ""), MAX_REASON_LENGTH);
    if (reason.length < 2) throw new GiftInputError("贈送原因至少需要 2 個字");

    if (giftType === "jcoins") {
      const amount = Number(body?.amount);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_JCOINS) {
        throw new GiftInputError(`J 幣數量必須是 1 至 ${MAX_JCOINS} 的整數`);
      }

      const result = await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);
        const targetResult = await tx.execute(sql`
          SELECT id, j_coins
          FROM users
          WHERE id = ${userId}
          FOR UPDATE
        `);
        const target = targetResult.rows[0] as { id: number; j_coins: number | string } | undefined;
        if (!target) throw new GiftInputError("找不到使用者");

        const balanceBefore = Number(target.j_coins ?? 0);
        const balanceAfter = balanceBefore + amount;
        await tx.update(users).set({ jCoins: balanceAfter }).where(eq(users.id, userId));
        await tx.insert(jCoinTransactions).values({
          userId,
          amount,
          type: "admin_adjust",
          reason: `管理員贈送：${reason}`,
          adminId: admin.id,
          metadata: { source: "admin_gift", balanceBefore, balanceAfter },
        });
        await tx.insert(adminLogs).values({
          adminId: admin.id,
          action: "贈送 J 幣",
          targetType: "user",
          targetId: userId,
          detail: JSON.stringify({ amount, reason, balanceBefore, balanceAfter }),
        });
        return { balanceBefore, balanceAfter };
      });

      return NextResponse.json({ ok: true, giftType, ...result });
    }

    const itemId = positiveId(body?.itemId, "物品 ID");
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);
      const [target] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      if (!target) throw new GiftInputError("找不到使用者");

      const [item] = await tx.select({ id: shopItems.id, name: shopItems.name, type: shopItems.type })
        .from(shopItems)
        .where(eq(shopItems.id, itemId))
        .limit(1);
      if (!item) throw new GiftInputError("找不到要贈送的商城物品");

      const [owned] = await tx.select({ id: userInventory.id })
        .from(userInventory)
        .where(sql`${userInventory.userId} = ${userId} AND ${userInventory.itemId} = ${itemId}`)
        .limit(1);
      if (owned) {
        throw new GiftInputError("這位使用者已經擁有該物品，未重複發送");
      }

      await tx.insert(userInventory).values({ userId, itemId, isEquipped: false });
      await tx.insert(honorNotifications).values({
        userId,
        type: "item",
        targetId: String(item.id),
        title: "🎁 你收到一份 JoinJoy 禮物！",
        content: `管理員送給你「${item.name}」。原因：${reason}`,
      });
      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: "贈送商城物品",
        targetType: "user",
        targetId: userId,
        detail: JSON.stringify({ itemId: item.id, itemName: item.name, itemType: item.type, reason }),
      });
      return { item };
    });

    return NextResponse.json({ ok: true, giftType, item: result.item });
  } catch (error) {
    return responseForError(error);
  }
}
