import { NextRequest, NextResponse } from "next/server";
import { and, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const suppliedSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("secret");
  if (expectedSecret && suppliedSecret !== expectedSecret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleted = await db.delete(analyticsEvents).where(and(inArray(analyticsEvents.eventName, ["error_occurred", "ai_error"]), lt(analyticsEvents.createdAt, cutoff))).returning({ id: analyticsEvents.id });
  return NextResponse.json({ ok: true, deleted: deleted.length, retainedSince: cutoff.toISOString() });
}
