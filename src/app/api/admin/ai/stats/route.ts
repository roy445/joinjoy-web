import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiUsageLogs } from "@/db/schema";
import { sql, gte, eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Basic Stats
    const todayResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error') as errors,
        AVG(latency_ms) FILTER (WHERE status = 'success') as avg_latency,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens
      FROM ai_usage_logs
      WHERE created_at >= ${today}
    `);

    const yesterdayResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM ai_usage_logs WHERE created_at >= ${yesterday} AND created_at < ${today}
    `);

    const statsRow = todayResult.rows[0] as any;
    const yestRow = yesterdayResult.rows[0] as any;
    
    const totalCount = Number(statsRow.total || 0);
    const growth = yestRow.total > 0 ? Math.round(((totalCount - yestRow.total) / yestRow.total) * 100) : 0;
    const successRate = totalCount > 0 ? Math.round((Number(statsRow.success || 0) / totalCount) * 100) : 100;

    // 2. Provider Distribution
    const providerRows = await db.execute(sql`
      SELECT provider, COUNT(*) as count
      FROM ai_usage_logs
      WHERE created_at >= ${today} AND provider = 'gemini'
      GROUP BY provider
    `);

    const providers = providerRows.rows.map((r: any) => ({
      name: r.provider,
      count: Number(r.count),
      share: totalCount > 0 ? Math.round((Number(r.count) / totalCount) * 100) : 0
    }));

    // 3. Recent Errors
    const recentErrorRows = await db.select()
      .from(aiUsageLogs)
      .where(and(eq(aiUsageLogs.provider, "gemini"), eq(aiUsageLogs.status, "error")))
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(5);

    return NextResponse.json({
      todayTotal: totalCount,
      todayErrors: Number(statsRow.errors || 0),
      avgLatency: Math.round(Number(statsRow.avg_latency || 0)),
      successRate,
      growth,
      tokens: {
        prompt: Number(statsRow.prompt_tokens || 0),
        completion: Number(statsRow.completion_tokens || 0),
        monthlyTotal: 0 // Simplified for now
      },
      providers,
      recentErrors: recentErrorRows.map(r => ({
        time: r.createdAt,
        provider: r.provider,
        model: r.model,
        message: r.error
      }))
    });
  } catch (err) {
    return errorResponse(err);
  }
}
