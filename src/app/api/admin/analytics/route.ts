import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

function dateParam(value: string | null, fallback: Date) { const date = value ? new Date(`${value}T00:00:00.000Z`) : fallback; return Number.isNaN(date.getTime()) ? fallback : date; }
function numberValue(value: unknown) { return Number(value || 0); }
function cleanRows(rows: unknown) { return Array.isArray(rows) ? rows : []; }

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = dateParam(req.nextUrl.searchParams.get("from"), defaultFrom);
    const to = dateParam(req.nextUrl.searchParams.get("to"), now);
    to.setUTCHours(23, 59, 59, 999);
    if (to <= from) throw new Error("日期區間不正確");
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const [summaryRows, funnelRows, trendRows, pageRows, featureRows, sourceRows, deviceRows, errorRows, realtimeRows] = await Promise.all([
      db.execute(sql`SELECT
        COUNT(DISTINCT anonymous_visitor_id)::int AS visitors,
        COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN user_id END)::int AS registered_users,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::int AS page_views,
        COUNT(*)::int AS events,
        COUNT(DISTINCT session_id)::int AS sessions,
        COUNT(DISTINCT CASE WHEN event_name = 'register_success' THEN user_id END)::int AS registrations,
        COUNT(DISTINCT CASE WHEN event_name = 'register_success' AND user_id IS NULL THEN anonymous_visitor_id END)::int AS anonymous_registrations
      FROM analytics_events WHERE created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp`),
      db.execute(sql`SELECT
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'page_view')::int AS landing,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'page_view' AND page_path = '/register')::int AS register_page,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'register_started')::int AS register_started,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'register_submitted')::int AS register_submitted,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'register_success')::int AS register_success,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'email_verified')::int AS email_verified,
        COUNT(DISTINCT anonymous_visitor_id) FILTER (WHERE event_name = 'first_login')::int AS first_login
      FROM analytics_events WHERE created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp`),
      db.execute(sql`SELECT DATE_TRUNC('day', created_at)::date AS day,
        COUNT(DISTINCT anonymous_visitor_id)::int AS visitors,
        COUNT(*) FILTER (WHERE event_name = 'page_view')::int AS page_views,
        COUNT(DISTINCT CASE WHEN event_name = 'register_success' THEN anonymous_visitor_id END)::int AS registrations,
        COUNT(*)::int AS events
      FROM analytics_events WHERE created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY 1 ORDER BY 1`),
      db.execute(sql`SELECT page_path AS path, COUNT(*)::int AS views, COUNT(DISTINCT anonymous_visitor_id)::int AS unique_views,
        COUNT(DISTINCT session_id)::int AS sessions
      FROM analytics_events WHERE event_name = 'page_view' AND page_path IS NOT NULL AND created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY page_path ORDER BY views DESC LIMIT 15`),
      db.execute(sql`SELECT event_name AS name, event_category AS category, COUNT(*)::int AS count, COUNT(DISTINCT anonymous_visitor_id)::int AS unique_users
      FROM analytics_events WHERE event_name <> 'page_view' AND created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY event_name, event_category ORDER BY count DESC LIMIT 20`),
      db.execute(sql`SELECT COALESCE(NULLIF(utm_source, ''), 'direct') AS source, COUNT(DISTINCT anonymous_visitor_id)::int AS visitors,
        COUNT(DISTINCT CASE WHEN event_name = 'register_success' THEN anonymous_visitor_id END)::int AS registrations
      FROM analytics_events WHERE created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY 1 ORDER BY visitors DESC LIMIT 15`),
      db.execute(sql`SELECT COALESCE(device_type, 'unknown') AS device, COUNT(DISTINCT anonymous_visitor_id)::int AS visitors, COUNT(*)::int AS events
      FROM analytics_events WHERE created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY 1 ORDER BY visitors DESC`),
      db.execute(sql`SELECT event_name AS name, COUNT(*)::int AS count, MAX(created_at) AS last_seen
      FROM analytics_events WHERE event_name IN ('error_occurred', 'ai_error') AND created_at >= ${fromIso}::timestamp AND created_at <= ${toIso}::timestamp
      GROUP BY event_name ORDER BY count DESC`),
      db.execute(sql`SELECT COUNT(DISTINCT session_id)::int AS active_sessions, COUNT(DISTINCT anonymous_visitor_id)::int AS active_visitors,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '15 minutes')::int AS recent_events
      FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 minutes'`),
    ]);
    const summary = cleanRows(summaryRows)[0] as Record<string, unknown> || {};
    const funnel = cleanRows(funnelRows)[0] as Record<string, unknown> || {};
    return NextResponse.json({
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, numberValue(value)])),
      funnel: Object.fromEntries(Object.entries(funnel).map(([key, value]) => [key, numberValue(value)])),
      trends: cleanRows(trendRows).map((row) => ({ ...row as Record<string, unknown>, visitors: numberValue((row as Record<string, unknown>).visitors), page_views: numberValue((row as Record<string, unknown>).page_views), registrations: numberValue((row as Record<string, unknown>).registrations), events: numberValue((row as Record<string, unknown>).events) })),
      topPages: cleanRows(pageRows),
      topFeatures: cleanRows(featureRows),
      sources: cleanRows(sourceRows),
      devices: cleanRows(deviceRows),
      errors: cleanRows(errorRows),
      realtime: (cleanRows(realtimeRows)[0] || {}) as Record<string, unknown>,
    });
  } catch (err) { return errorResponse(err); }
}
