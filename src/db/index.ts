import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { recordDbQuery } from "@/lib/db-monitor";

const databaseUrl = process.env.DATABASE_URL;
export const isDatabaseConfigured = Boolean(databaseUrl);
const connectionString = databaseUrl ?? "postgresql://127.0.0.1:5432/joinjoy_unconfigured";
const poolMax = Math.min(3, Math.max(1, Number(process.env.DB_POOL_MAX ?? 1)));

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    connectionTimeoutMillis: 1000,
    idleTimeoutMillis: 10000,
    maxUses: 500,
    max: poolMax,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

const globalForDbMonitor = globalThis as typeof globalThis & { __joinjoyDbQueryWrapped?: boolean };
if (!globalForDbMonitor.__joinjoyDbQueryWrapped) {
  const originalQuery = pool.query.bind(pool);
  pool.query = ((...args: Parameters<Pool["query"]>) => {
    const startedAt = Date.now();
    const firstArg = args[0] as unknown;
    const text = typeof firstArg === "string" ? firstArg : (firstArg as { text?: string } | undefined)?.text || "";
    const operation = (text.match(/^\s*([a-z]+)/i)?.[1] || "unknown").toUpperCase();
    const result = (originalQuery as unknown as (...queryArgs: Parameters<Pool["query"]>) => unknown)(...args);
    const maybePromise = result as { finally?: (callback: () => void) => unknown } | null | undefined;
    if (maybePromise && typeof maybePromise.finally === "function") {
      return maybePromise.finally(() => recordDbQuery(operation, Date.now() - startedAt));
    }
    recordDbQuery(operation, Date.now() - startedAt);
    return result;
  }) as Pool["query"];
  globalForDbMonitor.__joinjoyDbQueryWrapped = true;
}

export const db = drizzle(pool, { schema });
