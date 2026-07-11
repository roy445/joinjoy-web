import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    const body = (await request.json()) as { name?: unknown; bio?: unknown; avatarUrl?: unknown; interests?: unknown };
    const updates: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim().length >= 2 && body.name.trim().length <= 80) updates.name = body.name.trim();
    if (typeof body.bio === "string" && body.bio.length <= 500) updates.bio = body.bio.trim();
    if (typeof body.avatarUrl === "string" && (!body.avatarUrl || /^https?:\/\//i.test(body.avatarUrl))) updates.avatarUrl = body.avatarUrl || null;
    if (Array.isArray(body.interests)) updates.interests = body.interests.filter((interest): interest is string => typeof interest === "string").slice(0, 20);
    const [updated] = await db.update(users).set(updates).where(eq(users.id, user.id)).returning({ id: users.id, name: users.name, email: users.email, bio: users.bio, avatarUrl: users.avatarUrl, interests: users.interests, creditScore: users.creditScore, role: users.role, status: users.status, createdAt: users.createdAt });
    return NextResponse.json({ user: updated });
  } catch {
    return NextResponse.json({ message: "個人資料更新失敗" }, { status: 500 });
  }
}
