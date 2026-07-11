import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { favorites } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ eventId: string }> };

export async function POST(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入才能收藏" }, { status: 401 });
    await db.insert(favorites).values({ eventId, userId: user.id }).onConflictDoNothing();
    return NextResponse.json({ favorited: true });
  } catch {
    return NextResponse.json({ message: "收藏失敗" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "請先登入" }, { status: 401 });
    await db.delete(favorites).where(and(eq(favorites.eventId, eventId), eq(favorites.userId, user.id)));
    return NextResponse.json({ favorited: false });
  } catch {
    return NextResponse.json({ message: "取消收藏失敗" }, { status: 500 });
  }
}
