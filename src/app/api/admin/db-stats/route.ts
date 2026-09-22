import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { getDbQueryStats } from "@/lib/db-monitor";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      scope: "current server instance",
      note: "這是 process-local 診斷統計，不是 Neon Usage 數據；不保存 SQL 文字或使用者資料。",
      ...getDbQueryStats(),
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (err) {
    return errorResponse(err);
  }
}
