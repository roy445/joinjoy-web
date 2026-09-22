"use client";
import { useEffect, useState } from "react";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { ChevronDown, ChevronUp, Filter, Loader2 } from "lucide-react";

type Log = { id: string; source: "admin" | "security"; action: string; targetType: string | null; targetId: number | null; detail: unknown; metadata: unknown; createdAt: string; actorName: string | null };
function formatDetail(value: unknown) { if (value === null || value === undefined || value === "") return "—"; if (typeof value === "string") { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } } return JSON.stringify(value, null, 2); }
export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [source, setSource] = useState("all");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const query = new URLSearchParams({ source, limit: "300" }); if (action.trim()) query.set("action", action.trim()); try { const res = await fetch(`/api/admin/logs?${query.toString()}`, { cache: "no-store" }); const data = await res.json(); setLogs(res.ok ? data.logs || [] : []); } finally { setLoading(false); } }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // load is intentionally recreated with the current filter values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, action]);
  const visibleLogs = logs.filter((log) => !search.trim() || `${log.action} ${log.actorName || ""} ${log.targetType || ""} ${formatDetail(log.metadata || log.detail)}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="flex flex-col gap-6"><SectionTitle eyebrow="ADMIN / AUDIT" title="操作與安全稽核日誌" action={<span className="rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700">{visibleLogs.length} 筆</span>} /><div className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4"><Filter size={16} className="text-soft" /><label className="flex items-center gap-2 text-sm text-soft">來源<select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm text-main"><option value="all">全部</option><option value="admin">管理員操作</option><option value="security">安全事件</option></select></label><input value={action} onChange={(e) => setAction(e.target.value)} placeholder="精確篩選 action" className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm text-main outline-none" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋操作者、目標或內容" className="min-w-56 flex-1 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm text-main outline-none" /></div>{loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" /></div> : visibleLogs.length === 0 ? <EmptyState icon="📜" title="尚無符合條件的紀錄" /> : <div className="card-surface overflow-hidden rounded-2xl"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-app-soft text-xs text-soft"><tr><th className="px-4 py-3 text-left">時間</th><th className="px-4 py-3 text-left">來源</th><th className="px-4 py-3 text-left">操作者</th><th className="px-4 py-3 text-left">操作</th><th className="px-4 py-3 text-left">目標</th><th className="px-4 py-3 text-left">詳情</th></tr></thead><tbody>{visibleLogs.map((log) => { const open = expanded === log.id; return <tr key={log.id} className="border-t border-[var(--color-border)] align-top"><td className="whitespace-nowrap px-4 py-3 text-xs text-soft">{timeAgo(log.createdAt)}</td><td className="px-4 py-3"><Badge tone={log.source === "security" ? "rose" : "brand"}>{log.source === "security" ? "安全" : "管理"}</Badge></td><td className="px-4 py-3 font-semibold text-main">{log.actorName || "系統／已刪除使用者"}</td><td className="px-4 py-3 text-main">{log.action}</td><td className="px-4 py-3 text-xs text-soft">{log.targetType || "—"} {log.targetId ? `#${log.targetId}` : ""}</td><td className="max-w-[360px] px-4 py-3 text-xs text-soft"><button type="button" onClick={() => setExpanded(open ? null : log.id)} className="inline-flex items-center gap-1 font-semibold text-brand-600">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {open ? "收合" : "查看"}</button>{open && <pre className="mt-2 max-w-full whitespace-pre-wrap break-words rounded-lg bg-app-soft p-2 text-[11px] text-main">{formatDetail(log.metadata || log.detail)}</pre>}</td></tr>; })}</tbody></table></div></div>}</div>;
}
