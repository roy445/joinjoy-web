import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { errorReports, serviceControls, systemAnnouncements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getErrorDefinition } from "@/lib/error-codes";
import { sendSupportMail } from "@/lib/mailer";
import { isSameOrigin, sanitize } from "@/lib/security";

export async function GET() {
  const [announcements, controls] = await Promise.all([
    db.select().from(systemAnnouncements).where(and(eq(systemAnnouncements.isActive, true), or(isNull(systemAnnouncements.expiresAt), gte(systemAnnouncements.expiresAt, new Date())))).orderBy(desc(systemAnnouncements.createdAt)).limit(8),
    db.select().from(serviceControls).where(eq(serviceControls.isEnabled, false)),
  ]);
  return NextResponse.json({ announcements, disabledServices: controls.map((item) => item.service) }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("NET-003");
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    if (!body || !["error", "suggestion", "question"].includes(body.kind)) throw new Error("SYS-002");
    const kind = body.kind as "error" | "suggestion" | "question";
    const message = sanitize(String(body.message || ""), 5000);
    if (message.length < 10) throw new Error("請至少描述 10 個字，讓我們能理解問題。");
    let errorName: string | null = null;
    if (kind === "error") {
      const definition = getErrorDefinition(String(body.errorCode || ""));
      if (!definition) throw new Error("錯誤回報必須選擇有效的錯誤代碼");
      errorName = definition.name;
    } else {
      const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const [recent] = await db.select({ id: errorReports.id }).from(errorReports).where(and(eq(errorReports.userId, user.id), eq(errorReports.kind, kind), gte(errorReports.createdAt, since))).limit(1);
      if (recent) throw new Error("建議或問題每 3 天只能送出一次；錯誤回報不受此限制。");
    }
    const report = await db.insert(errorReports).values({ userId: user.id, kind, errorCode: kind === "error" ? String(body.errorCode) : null, errorName, pagePath: sanitize(String(body.pagePath || "/"), 300), email: sanitize(String(body.email || user.email || ""), 255) || null, message }).returning({ id: errorReports.id });
    let mailWarning = false;
    try { const result = await sendSupportMail(`[JoinJoy] ${kind === "error" ? `${body.errorCode} ${errorName}` : kind}`, `報告編號：${report[0]?.id}\n使用者：${user.email}\n頁面：${body.pagePath || "/"}\n\n${message}`); mailWarning = !result.sent; } catch { mailWarning = true; }
    return NextResponse.json({ ok: true, id: report[0]?.id, mailWarning });
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const code = /^[A-Z]+-\d+$/.test(raw) ? raw : null;
    const status = raw === "請先登入" || raw === "您的帳號已被停權" ? 401 : 400;
    return NextResponse.json({ ok: false, error: code ? "抱歉，遇到了一些錯誤。" : raw || "抱歉，遇到了一些錯誤。", code }, { status });
  }
}
