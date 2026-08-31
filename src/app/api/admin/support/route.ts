import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { analysisUsageLogs, errorReports, serviceControls, systemAnnouncements } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ERROR_CATALOG, getErrorDefinition } from "@/lib/error-codes";
import { sendSupportMail } from "@/lib/mailer";
import { isSameOrigin, sanitize } from "@/lib/security";

export async function GET() {
  try {
    await requireAdmin();
    const [reports, announcements, controls, usage] = await Promise.all([
      db.select().from(errorReports).orderBy(desc(errorReports.createdAt)).limit(100),
      db.select().from(systemAnnouncements).orderBy(desc(systemAnnouncements.createdAt)).limit(100),
      db.select().from(serviceControls).orderBy(serviceControls.service),
      db.select().from(analysisUsageLogs).orderBy(desc(analysisUsageLogs.createdAt)).limit(100),
    ]);
    return NextResponse.json({ reports, announcements, controls, usage, errorCodes: ERROR_CATALOG });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "AUTH-002" }, { status: 403 }); }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) throw new Error("NET-003");
    const admin = await requireAdmin();
    const body = await req.json().catch(() => null);
    const action = String(body?.action || "");
    if (action === "manual") {
      const title = sanitize(String(body.title || ""), 180);
      const content = sanitize(String(body.message || ""), 2000);
      if (!title || content.length < 5) throw new Error("請提供公告標題與至少 5 個字的內容");
      const [announcement] = await db.insert(systemAnnouncements).values({ title, content, kind: "manual", severity: "low", createdBy: admin.id }).returning();
      return NextResponse.json({ ok: true, announcement });
    }
    if (action === "publish") {
      const definition = getErrorDefinition(String(body.errorCode || ""));
      if (!definition) throw new Error("請選擇有效錯誤代碼");
      const [announcement] = await db.insert(systemAnnouncements).values({ title: `${definition.code}｜${definition.name}`, content: sanitize(String(body.message || definition.description), 2000), kind: "error_test", errorCode: definition.code, severity: definition.severity, createdBy: admin.id }).returning();
      const [control] = await db.select({ id: serviceControls.id }).from(serviceControls).where(eq(serviceControls.service, definition.service)).limit(1);
      if (control) await db.update(serviceControls).set({ isEnabled: false, activeErrorCode: definition.code, publicMessage: definition.description, updatedBy: admin.id, updatedAt: new Date() }).where(eq(serviceControls.id, control.id));
      else await db.insert(serviceControls).values({ service: definition.service, isEnabled: false, activeErrorCode: definition.code, publicMessage: definition.description, updatedBy: admin.id });
      if (definition.severity === "high" || definition.severity === "critical") { try { await sendSupportMail(`[JoinJoy 緊急錯誤] ${definition.code} ${definition.name}`, `管理員已啟用錯誤測試或服務保護。\n${definition.description}`); } catch { /* report remains visible in admin history */ } }
      return NextResponse.json({ ok: true, announcement });
    }
    if (action === "resolve") {
      const id = Number(body.id);
      await db.update(systemAnnouncements).set({ isActive: false, resolvedAt: new Date() }).where(eq(systemAnnouncements.id, id));
      if (body.service) await db.update(serviceControls).set({ isEnabled: true, activeErrorCode: null, publicMessage: null, updatedBy: admin.id, updatedAt: new Date() }).where(eq(serviceControls.service, String(body.service)));
      return NextResponse.json({ ok: true });
    }
    if (action === "toggle") {
      const service = sanitize(String(body.service || ""), 50); const enabled = Boolean(body.enabled);
      const [control] = await db.select({ id: serviceControls.id }).from(serviceControls).where(eq(serviceControls.service, service)).limit(1);
      if (control) await db.update(serviceControls).set({ isEnabled: enabled, updatedBy: admin.id, updatedAt: new Date() }).where(eq(serviceControls.id, control.id));
      else await db.insert(serviceControls).values({ service, isEnabled: enabled, updatedBy: admin.id });
      return NextResponse.json({ ok: true });
    }
    throw new Error("不支援的管理操作");
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "SYS-002" }, { status: 400 }); }
}
