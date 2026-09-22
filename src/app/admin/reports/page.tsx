"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, ChevronDown, ChevronUp, Filter, Loader2, X } from "lucide-react";

type ReportAction = { id: number; action: string; note: string | null; createdAt: string; adminName: string | null };
type Report = { id: number; type: string; targetId: number; reason: string; description: string | null; status: string; createdAt: string; reporterName: string | null; eventId: number | null; eventTitle: string | null; actions: ReportAction[] };
const statusLabel: Record<string, string> = { pending: "待處理", resolved: "查證屬實", rejected: "不成立" };
const typeLabel: Record<string, string> = { event: "活動", comment: "留言", chat: "聊天室", user: "使用者" };
const statusTone: Record<string, "coral" | "brand" | "gray"> = { pending: "coral", resolved: "brand", rejected: "gray" };

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);
  async function load() {
    setLoading(true);
    const query = new URLSearchParams({ limit: "100" });
    if (status !== "all") query.set("status", status);
    if (type !== "all") query.set("type", type);
    try { const res = await fetch(`/api/admin/reports?${query.toString()}`, { cache: "no-store" }); const data = await res.json(); setReports(res.ok ? data.reports || [] : []); } finally { setLoading(false); }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // load is intentionally recreated with the current filter values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, type]);
  async function act(report: Report, action: "resolve" | "reject") {
    const note = window.prompt(action === "resolve" ? "請輸入處理備註（可留空）" : "請輸入不成立原因（建議填寫）", "");
    if (note === null) return;
    setActing(report.id);
    try { const res = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: report.id, action, note }) }); const data = await res.json(); if (!res.ok) window.alert(data.error || "處理失敗"); await load(); } finally { setActing(null); }
  }
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN / SAFETY" title="檢舉案件處理" action={<span className="rounded-full bg-coral-500/10 px-3 py-1.5 text-xs font-bold text-coral-600">待處理 {reports.filter((r) => r.status === "pending").length} 件</span>} />
      <div className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4"><Filter size={16} className="text-soft" /><label className="flex items-center gap-2 text-sm text-soft">狀態<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm text-main"><option value="pending">待處理</option><option value="resolved">查證屬實</option><option value="rejected">不成立</option><option value="all">全部</option></select></label><label className="flex items-center gap-2 text-sm text-soft">類型<select value={type} onChange={(e) => setType(e.target.value)} className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm text-main"><option value="all">全部類型</option><option value="event">活動</option><option value="comment">留言</option><option value="chat">聊天室</option><option value="user">使用者</option></select></label></div>
      {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-500" /></div> : reports.length === 0 ? <EmptyState icon="🚩" title="目前沒有符合條件的檢舉案件" /> : <div className="flex flex-col gap-3">{reports.map((report) => { const isExpanded = expanded === report.id; return <div key={report.id} className="card-surface rounded-2xl p-4"><div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-main">#{report.id} · {typeLabel[report.type] || report.type} 檢舉</p><Badge tone={statusTone[report.status] || "gray"}>{statusLabel[report.status] || report.status}</Badge></div><p className="mt-1 text-sm text-soft">原因：{report.reason} · 檢舉人：{report.reporterName || `#${report.targetId}`}</p>{report.eventTitle && <p className="mt-1 text-sm font-semibold text-main">活動：{report.eventTitle}</p>}{report.description && <p className="mt-2 whitespace-pre-wrap text-sm text-main">{report.description}</p>}<p className="mt-2 text-xs text-soft">建立於 {timeAgo(report.createdAt)} · 處理紀錄 {report.actions.length} 筆</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => setExpanded(isExpanded ? null : report.id)} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold text-soft hover:text-main">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} 詳情</button>{report.eventId && <Link href={`/events/${report.eventId}`} className="rounded-full border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-500/10">查看活動</Link>}</div></div>{isExpanded && <div className="mt-4 rounded-xl bg-app-soft p-3 text-xs"><p className="font-bold text-main">處理歷程</p>{report.actions.length === 0 ? <p className="mt-2 text-soft">尚無處理紀錄。</p> : <div className="mt-2 space-y-2">{report.actions.map((item) => <div key={item.id} className="border-l-2 border-brand-300 pl-3"><p className="font-semibold text-main">{item.adminName || "管理員"} · {item.action === "resolved" ? "查證屬實" : "標記不成立"}</p><p className="text-soft">{item.note || "未填寫備註"} · {timeAgo(item.createdAt)}</p></div>)}</div>}</div>}{report.status === "pending" && <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-3"><button disabled={acting === report.id} onClick={() => act(report, "resolve")} className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Check size={13} /> 查證屬實</button><button disabled={acting === report.id} onClick={() => act(report, "reject")} className="inline-flex items-center gap-1 rounded-full bg-gray-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><X size={13} /> 不成立</button></div>}</div>; })}</div>}
    </div>
  );
}
