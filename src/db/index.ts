import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { recordDbQuery } from "@/lib/db-monitor";

const databaseUrl = process.env.DATABASE_URL;
export const isDatabaseConfigured = Boolean(databaseUrl);
const connectionString = databaseUrl ?? "postgresql://127.0.0.1:5432/joinjoy_unconfigured";

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
}

// Keep the pool small for Vercel/serverless instances, but allow normal cold
// starts and cross-region TLS connections enough time to establish.
const poolMax = boundedInteger(process.env.DB_POOL_MAX, 1, 1, 3);
const connectionTimeoutMillis = boundedInteger(process.env.DB_CONNECTION_TIMEOUT_MS, 10_000, 2_000, 30_000);
const idleTimeoutMillis = boundedInteger(process.env.DB_IDLE_TIMEOUT_MS, 10_000, 1_000, 60_000);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    maxUses: 500,
    max: poolMax,
    keepAlive: true,
    allowExitOnIdle: true,
  });

// Reuse the pool in warm serverless instances and during local hot reload.
// The small max value above prevents an unbounded connection fan-out.
globalForDb.__arenaNextJsPostgresqlPool = pool;

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
