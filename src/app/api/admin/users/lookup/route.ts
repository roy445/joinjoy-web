import { NextRequest, NextResponse } from "next/server";
import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api";
import { clientKey, isSameOrigin, rateLimit } from "@/lib/security";

const MAX_RESULTS = 50;
const MAX_QUERY_LENGTH = 100;

export async function GET(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "請求來源不正確" }, { status: 403 });
    }

    const admin = await requireAdmin();
    if (!rateLimit(clientKey(req, `admin-user-lookup:${admin.id}`), 60, 60_000)) {
      return NextResponse.json({ error: "搜尋過於頻繁，請稍後再試" }, { status: 429 });
    }

    const query = req.nextUrl.searchParams.get("q")?.trim().slice(0, MAX_QUERY_LENGTH) ?? "";
    const numericId = /^\d+$/.test(query) ? Number(query) : 0;
    const where = query
      ? or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`),
          numericId > 0 ? eq(users.id, numericId) : undefined,
        )
      : undefined;

    const results = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        jCoins: users.jCoins,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(MAX_RESULTS);

    return NextResponse.json({ users: results });
  } catch (error) {
    return errorResponse(error);
  }
}
