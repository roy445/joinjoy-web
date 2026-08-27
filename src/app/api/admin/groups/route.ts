import { NextResponse } from "next/server";
import { db } from "@/db";
import { userGroups } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const groups = await db.select().from(userGroups).orderBy(desc(userGroups.createdAt));
    return NextResponse.json(groups);
  } catch (err) {
    return errorResponse(err);
  }
}
