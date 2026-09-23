import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents, analyticsSessions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { clientKey, isSameOrigin, rateLimit } from "@/lib/security";

const allowedEvents = new Set([
  "page_view", "register_started", "register_submitted", "register_success", "email_verified", "first_login",
  "feature_click", "event_list_view", "event_detail_view", "join_click", "join_success", "favorite_click", "share_click",
  "poll_vote", "event_create_started", "event_create_success", "ai_opened", "ai_started", "ai_completed", "ai_cancelled", "ai_error",
  "shop_view", "product_view", "purchase_click", "purchase_success", "purchase_cancelled", "item_equip", "item_unequip",
  "report_submitted", "error_occurred", "session_start", "session_end",
]);
const blockedKey = /password|token|secret|api.?key|cookie|authorization|message|content|email|phone|address|prompt|conversation/i;
function safeMetadata(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (blockedKey.test(key) || !/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) continue;
    if (value === null || typeof value === "boolean" || typeof value === "number") output[key] = value;
    else if (typeof value === "string") output[key] = value.slice(0, 200);
  }
  return output;
}
function text(value: unknown, max: number) { return typeof value === "string" ? value.slice(0, max) || null : null; }
function integer(value: unknown) { return typeof value === "number" && Number.isSafeInteger(value) ? value : null; }
type AnalyticsInsertRow = {
  anonymousVisitorId: string;
  sessionId: string;
  userId: number | null;
  eventName: string;
  eventCategory: string;
  pagePath: string | null;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  screenWidth: number | null;
  screenHeight: number | null;
  metadata: Record<string, string | number | boolean | null>;
};

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    if (!rateLimit(clientKey(req, "analytics"), 120, 60_000)) return NextResponse.json({ error: "分析事件請求太頻繁" }, { status: 429 });
    const body = await req.json().catch(() => null);
    const rawEvents = Array.isArray(body?.events) ? body.events.slice(0, 20) : [];
    if (!rawEvents.length) return NextResponse.json({ ok: true, accepted: 0 });
    const user = await getCurrentUser();
    const context = body?.context && typeof body.context === "object" ? body.context : {};
    const referrer = text(context.referrer, 500);
    const pagePath = text(context.pagePath, 300);
    const utm = context.utm && typeof context.utm === "object" ? context.utm : {};
    const visitor = text(rawEvents[0]?.anonymousVisitorId, 80) || "unknown";
    const sessionIds = new Set<string>();
    const rows: AnalyticsInsertRow[] = rawEvents.flatMap((event: Record<string, unknown>) => {
      const eventName = text(event.name, 100);
      const sessionId = text(event.sessionId, 80);
      if (!eventName || !sessionId || !allowedEvents.has(eventName)) return [];
      const anonymousVisitorId = text(event.anonymousVisitorId, 80) || visitor;
      sessionIds.add(sessionId);
      return [{
        anonymousVisitorId,
        sessionId,
        userId: user?.id ?? null,
        eventName,
        eventCategory: text(event.category, 40) || "product",
        pagePath: text(event.pagePath, 300) || pagePath,
        referrer,
        utmSource: text((utm as Record<string, unknown>).utm_source, 100),
        utmMedium: text((utm as Record<string, unknown>).utm_medium, 100),
        utmCampaign: text((utm as Record<string, unknown>).utm_campaign, 150),
        deviceType: text(event.deviceType, 20),
        browser: text(event.browser, 40),
        os: text(event.os, 40),
        screenWidth: integer(event.screenWidth),
        screenHeight: integer(event.screenHeight),
        metadata: safeMetadata(event.metadata),
      }];
    });
    if (!rows.length) return NextResponse.json({ ok: true, accepted: 0 });
    await db.insert(analyticsEvents).values(rows);
    const now = new Date();
    for (const sessionId of sessionIds) {
      const sessionRows = rows.filter((row) => row.sessionId === sessionId);
      const first = sessionRows[0];
      const pageCount = sessionRows.filter((row) => row.eventName === "page_view").length;
      await db.insert(analyticsSessions).values({
        sessionId,
        anonymousVisitorId: first.anonymousVisitorId,
        userId: user?.id ?? null,
        startedAt: now,
        lastActivityAt: now,
        pageCount,
        eventCount: sessionRows.length,
        deviceType: first.deviceType,
        browser: first.browser,
        os: first.os,
      }).onConflictDoUpdate({
        target: analyticsSessions.sessionId,
        set: {
          lastActivityAt: now,
          userId: user?.id ?? undefined,
          pageCount: sql`${analyticsSessions.pageCount} + ${pageCount}`,
          eventCount: sql`${analyticsSessions.eventCount} + ${sessionRows.length}`,
        },
      });
    }
    return NextResponse.json({ ok: true, accepted: rows.length });
  } catch (error) {
    console.error("Analytics ingestion error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}
