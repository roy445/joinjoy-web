import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, reports } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入才能檢舉" }, { status: 401 });
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return NextResponse.json({ message: "找不到活動" }, { status: 404 });
    const body = (await request.json()) as { reason?: unknown; details?: unknown };
    const reason = typeof body.reason === "string" ? body.reason.trim() : "其他問題";
    const details = typeof body.details === "string" ? body.details.trim() : null;
    const [report] = await db.insert(reports).values({ reporterId: user.id, eventId, reason, details }).returning({ id: reports.id, status: reports.status });
    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "檢舉送出失敗" }, { status: 500 });
  }
}
