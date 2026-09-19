import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

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

export const db = drizzle(pool, { schema });
