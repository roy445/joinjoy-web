import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, createGroupRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const [fullUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    const requests = await db
      .select()
      .from(createGroupRequests)
      .where(eq(createGroupRequests.userId, user.id))
      .orderBy(desc(createGroupRequests.createdAt));

    return NextResponse.json({
      canCreateGroup: fullUser.canCreateGroup,
      credits: fullUser.groupCreateCredits,
      isAdmin: user.role === "admin",
      hasAgreedGroupGuidelines: !!fullUser.groupGuidelinesAgreedAt,
      requests,
    });
  } catch (err) {
    return errorResponse(err);
  }
}