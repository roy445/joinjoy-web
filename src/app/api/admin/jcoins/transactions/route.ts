import { NextResponse } from "next/server";
import { db } from "@/db";
import { jCoinTransactions } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const txs = await db.select().from(jCoinTransactions).orderBy(desc(jCoinTransactions.createdAt)).limit(100);
    return NextResponse.json(txs);
  } catch (err) {
    return errorResponse(err);
  }
}
