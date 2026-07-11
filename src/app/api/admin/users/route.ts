import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const result = await db.select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status, creditScore: users.creditScore, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(200);
    return NextResponse.json({ users: result });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = (await request.json()) as { userId?: unknown; status?: unknown };
    if (typeof body.userId !== "string" || (body.status !== "active" && body.status !== "suspended")) return NextResponse.json({ message: "會員資料不正確" }, { status: 400 });
    const [updated] = await db.update(users).set({ status: body.status, updatedAt: new Date() }).where(eq(users.id, body.userId)).returning({ id: users.id, name: users.name, status: users.status });
    if (!updated) return NextResponse.json({ message: "找不到會員" }, { status: 404 });
    await db.insert(auditLogs).values({ actorId: admin.id, action: body.status === "suspended" ? "user_suspended" : "user_unsuspended", entityType: "user", entityId: body.userId });
    return NextResponse.json({ user: updated });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error && error.message === "FORBIDDEN" ? "需要管理員權限" : "請先登入" }, { status: error instanceof Error && error.message === "FORBIDDEN" ? 403 : 401 });
  }
}
