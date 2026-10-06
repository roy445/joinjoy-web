import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Configure it in Vercel Environment Variables.");
}

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.floor(parsed))) : fallback;
}

const databaseTimeoutMs = boundedInteger(
  process.env.DB_QUERY_TIMEOUT_MS,
  10_000,
  2_000,
  30_000,
);

function withStatementTimeout(connectionString: string, timeoutMs: number): string {
  const url = new URL(connectionString);
  const existingOptions = url.searchParams.get("options");
  if (existingOptions?.includes("statement_timeout")) return connectionString;

  const statementTimeoutOption = `-c statement_timeout=${timeoutMs}`;
  url.searchParams.set(
    "options",
    existingOptions ? `${existingOptions} ${statementTimeoutOption}` : statementTimeoutOption,
  );
  return url.toString();
}

// Neon HTTP requests do not hold a PostgreSQL socket in each Vercel
// invocation. Abort both connection establishment and query response after a
// bounded interval rather than allowing a request to hang indefinitely.
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), databaseTimeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const sql = neon(withStatementTimeout(databaseUrl, databaseTimeoutMs), {
  fetchOptions: { cache: "no-store" },
});

export const db = drizzle(sql);
