import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { honorNotifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get unseen notifications
    const unseen = await db
      .select()
      .from(honorNotifications)
      .where(
        and(
          eq(honorNotifications.userId, user.id),
          eq(honorNotifications.isSeen, false)
        )
      );

    if (unseen.length > 0) {
      // Mark as seen
      await db
        .update(honorNotifications)
        .set({ isSeen: true })
        .where(
          and(
            eq(honorNotifications.userId, user.id),
            eq(honorNotifications.isSeen, false)
          )
        );
    }

    return NextResponse.json({ notifications: unseen });
  } catch (error) {
    console.error("API Honor Notifications Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
