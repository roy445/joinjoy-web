import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminLogs, jCoinTransactions, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { clientKey, isSameOrigin, rateLimit, sanitize } from "@/lib/security";

const MAX_MANUAL_ADJUSTMENT = 100_000;

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    }

    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-jcoins:${admin.id}`), 20, 60_000)) {
      return NextResponse.json({ error: "操作過於頻繁，請稍後再試" }, { status: 429 });
    }

    const body = await req.json().catch(() => null) as {
      userId?: unknown;
      amount?: unknown;
      reason?: unknown;
    } | null;
    const userId = Number(body?.userId);
    const amount = Number(body?.amount);
    const reason = sanitize(String(body?.reason ?? ""), 255);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "使用者 ID 不正確" }, { status: 400 });
    }
    if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_MANUAL_ADJUSTMENT) {
      return NextResponse.json({ error: `J 幣調整必須是 1 至 ${MAX_MANUAL_ADJUSTMENT} 的整數，或其負值` }, { status: 400 });
    }
    if (reason.length < 2) {
      return NextResponse.json({ error: "人工調整必須填寫原因" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // PostgreSQL transaction advisory lock prevents two concurrent manual adjustments
      // for the same account from passing the balance check at the same time.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${userId})`);

      const targetResult = await tx.execute(sql`
        SELECT id, j_coins
        FROM users
        WHERE id = ${userId}
        FOR UPDATE
      `);
      const target = targetResult.rows[0] as { id: number; j_coins: number | string } | undefined;
      if (!target) {
        throw new Error("找不到使用者");
      }

      const balanceBefore = Number(target.j_coins ?? 0);
      const balanceAfter = balanceBefore + amount;
      if (balanceAfter < 0) {
        throw new Error(`餘額不足，目前只有 ${balanceBefore} J 幣`);
      }

      await tx
        .update(users)
        .set({ jCoins: sql`${users.jCoins} + ${amount}` })
        .where(eq(users.id, userId));

      await tx.insert(jCoinTransactions).values({
        userId,
        amount,
        type: "admin_adjust",
        reason,
        adminId: admin.id,
        metadata: {
          balanceBefore,
          balanceAfter,
          source: "admin_manual_adjustment",
        },
      });

      await tx.insert(adminLogs).values({
        adminId: admin.id,
        action: amount > 0 ? "人工增加 J 幣" : "人工扣除 J 幣",
        targetType: "user",
        targetId: userId,
        detail: JSON.stringify({ amount, reason, balanceBefore, balanceAfter }),
      });

      return { balanceBefore, balanceAfter };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
