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

    // 2. Four Gemini API slots. Historical "gemini" records are assigned to slot 1.
    const geminiRows = await db.execute(sql`
      SELECT
        provider,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'error') as errors,
        COALESCE(SUM(prompt_tokens), 0) as prompt_tokens,
        COALESCE(SUM(completion_tokens), 0) as completion_tokens,
        COALESCE(AVG(latency_ms) FILTER (WHERE status = 'success'), 0) as avg_latency
      FROM ai_usage_logs
      WHERE created_at >= ${today}
        AND (provider = 'gemini' OR provider LIKE 'gemini-%')
      GROUP BY provider
    `);
    const geminiApis = Array.from({ length: 4 }, (_, index) => {
      const slot = index + 1;
      const row = geminiRows.rows.find((item: any) => {
        const provider = String(item.provider);
        return provider === `gemini-${slot}` || (slot === 1 && provider === "gemini");
      }) as any;
      const promptTokens = Number(row?.prompt_tokens || 0);
      const completionTokens = Number(row?.completion_tokens || 0);
      return {
        slot,
        name: `Gemini API ${slot}`,
        configured: Boolean(process.env[`GEMINI_API_KEY_${slot}`] || (slot === 1 && process.env.GEMINI_API_KEY)),
        requests: Number(row?.count || 0),
        success: Number(row?.success || 0),
        errors: Number(row?.errors || 0),
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        avgLatency: Math.round(Number(row?.avg_latency || 0)),
      };
    });
    const geminiRequestTotal = geminiApis.reduce((sum, item) => sum + item.requests, 0);
    const providers = [{
      name: "gemini",
      count: geminiRequestTotal,
      share: totalCount > 0 ? Math.round((geminiRequestTotal / totalCount) * 100) : 0
    }];

    const trendStart = new Date(Date.now() - 23 * 60 * 60 * 1000);
    const trendRows = await db.execute(sql`
      SELECT
        date_trunc('hour', created_at) as hour,
        provider,
        COALESCE(SUM(prompt_tokens), 0) + COALESCE(SUM(completion_tokens), 0) as tokens
      FROM ai_usage_logs
      WHERE created_at >= ${trendStart}
        AND (provider = 'gemini' OR provider LIKE 'gemini-%')
      GROUP BY date_trunc('hour', created_at), provider
      ORDER BY hour ASC
    `);
    const trendByHour = new Map<string, { api1: number; api2: number; api3: number; api4: number }>();
    for (let index = 23; index >= 0; index -= 1) {
      const hour = new Date(Date.now() - index * 60 * 60 * 1000);
      hour.setMinutes(0, 0, 0);
      trendByHour.set(hour.toISOString().slice(0, 13), { api1: 0, api2: 0, api3: 0, api4: 0 });
    }
    for (const row of trendRows.rows as Array<{ hour: string | Date; provider: string; tokens: string | number }>) {
      const hourKey = new Date(row.hour).toISOString().slice(0, 13);
      const point = trendByHour.get(hourKey);
      if (!point) continue;
      const provider = String(row.provider);
      const slot = provider === "gemini" ? 1 : Number(provider.match(/^gemini-(\d+)$/)?.[1]);
      if (slot >= 1 && slot <= 4) point[`api${slot}` as "api1" | "api2" | "api3" | "api4"] += Number(row.tokens || 0);
    }
    const geminiTokenTrend = [...trendByHour.entries()].map(([hour, values]) => ({
      hour,
      label: new Date(`${hour}:00:00.000Z`).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Taipei" }),
      ...values,
    }));

    // 3. Recent Errors
    const recentErrorRows = await db.select()
      .from(aiUsageLogs)
      .where(and(sql`${aiUsageLogs.provider} LIKE 'gemini%'`, eq(aiUsageLogs.status, "error")))
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
      geminiApis,
      geminiTokenTrend,
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
