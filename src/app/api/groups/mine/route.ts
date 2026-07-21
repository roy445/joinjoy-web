import { NextResponse } from "next/server";
import { db } from "@/db";
import { groups, groupMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { errorResponse } from "@/lib/api";

// Groups the current user is an approved member of — used to populate the
// "publish only within a group" selector when creating/editing an event.
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({ id: groups.id, name: groups.name, role: groupMembers.role })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(and(eq(groupMembers.userId, user.id), eq(groupMembers.status, "approved")));
    return NextResponse.json({ groups: rows });
  } catch (err) {
    return errorResponse(err);
  }
}