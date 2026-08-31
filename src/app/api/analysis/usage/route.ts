import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { analysisUsageLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { serviceError } from "@/lib/service-status";
import { isSameOrigin, sanitize } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return NextResponse.json({ error: "NET-003" }, { status: 403 });
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const blocked = await serviceError("analysis");
    await db.insert(analysisUsageLogs).values({ userId: user?.id ?? null, pagePath: sanitize(String(body.pagePath || "/planner"), 300), platform: sanitize(String(body.platform || "unknown"), 40), status: blocked ? "blocked" : "started" });
    if (blocked) return NextResponse.json({ ok: false, error: blocked.message, code: blocked.code }, { status: 503 });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ ok: false, error: "抱歉，遇到了一些錯誤。", code: "DB-003" }, { status: 500 }); }
}
