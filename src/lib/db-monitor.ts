export type DbQueryStat = {
  operation: string;
  count: number;
  totalMs: number;
  maxMs: number;
  lastMs: number;
  lastAt: string;
};

type DbMonitorState = { total: number; stats: Map<string, DbQueryStat> };
const globalForDbMonitor = globalThis as typeof globalThis & { __joinjoyDbMonitor?: DbMonitorState };
const state = globalForDbMonitor.__joinjoyDbMonitor ?? { total: 0, stats: new Map<string, DbQueryStat>() };
if (process.env.NODE_ENV !== "production") globalForDbMonitor.__joinjoyDbMonitor = state;

export function recordDbQuery(operation: string, durationMs: number) {
  state.total += 1;
  const previous = state.stats.get(operation);
  const next: DbQueryStat = {
    operation,
    count: (previous?.count ?? 0) + 1,
    totalMs: (previous?.totalMs ?? 0) + durationMs,
    maxMs: Math.max(previous?.maxMs ?? 0, durationMs),
    lastMs: durationMs,
    lastAt: new Date().toISOString(),
  };
  state.stats.set(operation, next);
  if (process.env.NODE_ENV !== "production" && durationMs >= 250) {
    console.warn(`[db-monitor] slow ${operation} ${Math.round(durationMs)}ms`);
  }
}

export function getDbQueryStats() {
  return {
    total: state.total,
    operations: [...state.stats.values()].map((stat) => ({
      ...stat,
      averageMs: stat.count ? Number((stat.totalMs / stat.count).toFixed(1)) : 0,
    })).sort((a, b) => b.totalMs - a.totalMs),
  };
}
