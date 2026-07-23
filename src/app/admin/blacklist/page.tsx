"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, X, ShieldOff, ShieldPlus, Search, Loader2 } from "lucide-react";
import { BLACKLIST_REASONS } from "@/lib/constants";

export default function AdminBlacklistPage() {
  const [data, setData] = useState<any>({ requests: [], activeList: [], history: [] });
  const [tab, setTab] = useState<"requests" | "active" | "history">("requests");
  const [showAddModal, setShowAddModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<any>(null);

  function load() {
    fetch("/api/admin/blacklist").then((r) => r.json()).then(setData);
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: string) {
    await fetch("/api/admin/blacklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }

  const statusLabel: Record<string, string> = { pending: "待審核", approved: "已核准", rejected: "已駁回" };
  const statusTone: Record<string, any> = { pending: "coral", approved: "rose", rejected: "gray" };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle
        eyebrow="ADMIN"
        title="黑名單管理"
        action={
          <button onClick={() => setShowAddModal(true)} className="btn-coral flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold">
            <ShieldPlus size={16} /> 直接列入黑名單
          </button>
        }
      />

      <div className="flex gap-2 rounded-full bg-app-soft p-1 w-fit">
        <button onClick={() => setTab("requests")} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === "requests" ? "bg-brand-500 text-white" : "text-soft"}`}>揪主申請 ({data.requests.length})</button>
        <button onClick={() => setTab("active")} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === "active" ? "bg-brand-500 text-white" : "text-soft"}`}>目前黑名單 ({data.activeList.length})</button>
        <button onClick={() => setTab("history")} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === "history" ? "bg-brand-500 text-white" : "text-soft"}`}>歷史紀錄 ({data.history.length})</button>
      </div>

      {tab === "requests" && (
        data.requests.length === 0 ? <EmptyState icon="🛡️" title="目前沒有黑名單申請" /> : (
          <div className="flex flex-col gap-2">
            {data.requests.map((r: any) => (
              <div key={r.id} className="card-surface flex flex-wrap items-start gap-3 rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-main">
                    揪主 <Link href={`/profile/${r.hostId}`} className="text-brand-600 hover:underline">{r.hostName}</Link> 申請將 <Link href={`/profile/${r.targetUserId}`} className="text-rose-500 hover:underline">{r.targetName}</Link> 列入黑名單
                  </p>
                  <p className="mt-1 text-sm text-soft">原因：{r.reason} {r.eventTitle && `· 活動：${r.eventTitle}`}</p>
                  <p className="mt-1 text-sm text-main">{r.description}</p>
                  <p className="mt-1 text-xs text-soft">{timeAgo(r.createdAt)}</p>
                </div>
                <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                {r.status === "pending" && (
                  <div className="flex gap-1.5">
                    <button onClick={() => act(r.id, "approve")} className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white"><Check size={12} /> 查核屬實・列入黑名單</button>
                    <button onClick={() => act(r.id, "reject")} className="flex items-center gap-1 rounded-full bg-gray-400 px-3 py-1.5 text-xs font-bold text-white"><X size={12} /> 駁回</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "active" && (
        data.activeList.length === 0 ? <EmptyState icon="✅" title="目前沒有黑名單使用者" /> : (
          <div className="flex flex-col gap-2">
            {data.activeList.map((b: any) => (
              <div key={b.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
                <Link href={`/profile/${b.userId}`} className="min-w-0 flex-1 font-semibold text-main hover:underline">{b.userName}</Link>
                <p className="text-sm text-soft">{b.reason}</p>
                <span className="text-xs text-soft">{timeAgo(b.createdAt)}</span>
                <button onClick={() => setRemoveTarget(b)} className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600"><ShieldOff size={12} /> 移出黑名單</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === "history" && (
        data.history.length === 0 ? <EmptyState icon="📜" title="尚無歷史紀錄" /> : (
          <div className="flex flex-col gap-2">
            {data.history.map((h: any) => (
              <div key={h.id} className="card-surface flex flex-col gap-1 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/profile/${h.userId}`} className="font-semibold text-main hover:underline">{h.userName}</Link>
                  <Badge tone="gray">已移出</Badge>
                  <span className="text-xs text-soft">{timeAgo(h.removedAt || h.createdAt)}</span>
                </div>
                <p className="text-xs text-soft">當初列管原因：{h.reason}</p>
                {h.removedReason && <p className="text-xs text-brand-600">移出原因：{h.removedReason}</p>}
              </div>
            ))}
          </div>
        )
      )}

      {showAddModal && <AddBlacklistModal onClose={() => setShowAddModal(false)} onDone={() => { setShowAddModal(false); load(); }} />}
      {removeTarget && (
        <RemoveBlacklistModal
          entry={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onDone={() => { setRemoveTarget(null); load(); }}
        />
      )}
    </div>
  );
}

function AddBlacklistModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [reason, setReason] = useState(BLACKLIST_REASONS[0]);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/members?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      setResults((d.members || []).filter((m: any) => m.role !== "admin"));
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const fullReason = detail ? `${reason}：${detail}` : reason;
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selected.id, reason: fullReason }),
      });
      const d = await res.json();
      if (res.ok) onDone();
      else setError(d.error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md animate-pop rounded-3xl p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-main"><ShieldPlus size={20} className="text-coral-500" /> 直接列入黑名單</h3>
        <p className="mt-1 text-xs text-soft">管理員可直接將違規使用者列入黑名單，此操作會立即生效並通知當事人。</p>
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        {!selected ? (
          <>
            <div className="mt-4 flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="輸入姓名或 Email 搜尋"
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none"
              />
              <button onClick={search} className="btn-brand flex items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold">
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>
            <div className="mt-3 flex max-h-56 flex-col gap-1 overflow-y-auto">
              {results.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-app-soft"
                >
                  <img src={m.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${m.id}`} className="h-8 w-8 rounded-full object-cover" alt="" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-main">{m.name}</span>
                  <span className="truncate text-xs text-soft">{m.email}</span>
                </button>
              ))}
              {results.length === 0 && query && !searching && <p className="px-3 py-2 text-xs text-soft">找不到符合的使用者</p>}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-app-soft px-3 py-2.5">
              <img src={selected.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${selected.id}`} className="h-8 w-8 rounded-full object-cover" alt="" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-main">{selected.name}</p>
                <p className="truncate text-xs text-soft">{selected.email}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs font-semibold text-brand-600">重選</button>
            </div>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-soft">原因</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none">
                {BLACKLIST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-soft">補充說明（選填）</span>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none" placeholder="事情經過或依據..." />
            </label>
          </>
        )}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">取消</button>
          {selected && (
            <button disabled={submitting} onClick={submit} className="btn-coral flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
              {submitting && <Loader2 size={16} className="animate-spin" />} 確認列入黑名單
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RemoveBlacklistModal({ entry, onClose, onDone }: { entry: any; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await fetch(`/api/admin/blacklist?id=${entry.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-sm animate-pop rounded-3xl p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-main"><ShieldOff size={20} className="text-brand-600" /> 移出黑名單 - {entry.userName}</h3>
        <p className="mt-1 text-xs text-soft">請說明移出原因，此說明會一併通知當事人並保存於歷史紀錄。</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="例如：重新查證後證實為誤會、當事人已完成溝通改善..."
          className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">取消</button>
          <button disabled={loading} onClick={submit} className="btn-brand flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 確認移出
          </button>
        </div>
      </div>
    </div>
  );
}