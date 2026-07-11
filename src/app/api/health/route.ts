import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[health] database error", error);
    if (process.env.NODE_ENV !== "production") {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "unknown";
      return Response.json({ ok: false, code, message: error instanceof Error ? error.message : "database error" }, { status: 500 });
    }
    return Response.json({ ok: false }, { status: 500 });
  }
}
