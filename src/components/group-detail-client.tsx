"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Users, Lock, Globe, PlusCircle, LogOut, Trash2, Check, X, Loader2, KeyRound, Copy, RefreshCw, Send } from "lucide-react";
import { EmptyState, Badge, Skeleton } from "@/components/ui";
import { EventCard } from "@/components/event-card";

export function GroupDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [events, setEvents] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    fetch(`/api/groups/${id}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (data?.isApprovedMember) {
      fetch(`/api/groups/${id}/events`).then((r) => (r.ok ? r.json() : { events: [] })).then((d) => setEvents(d.events || []));
    }
  }, [data?.isApprovedMember, id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function requestJoin() {
    const res = await fetch(`/api/groups/${id}/join`, { method: "POST" });
    const d = await res.json();
    if (res.ok) { showToast(d.message); load(); } else showToast(d.error);
  }

  async function leave() {
    if (!confirm("確定要退出此社團嗎？")) return;
    const res = await fetch(`/api/groups/${id}/join`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { showToast("已退出社團"); load(); } else showToast(d.error);
  }

  async function deleteGroup() {
    if (!confirm("確定要永久刪除此社團嗎？社團內的活動仍會保留，但將轉為一般公開活動。")) return;
    const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/groups";
  }

  async function actOnMember(memberId: number, action: string) {
    const res = await fetch(`/api/groups/${id}/members/${memberId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await res.json();
    if (res.ok) load(); else showToast(d.error);
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-64" /></div>;
  if (!data || data.error) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-soft">找不到這個社團，它可能已被刪除。</div>;

  const { group, inviteCode, ownerName, ownerAvatar, memberCount, myMembership, isOwner, isAdmin, isApprovedMember, members, pendingMembers } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 animate-fade-up rounded-full px-4 py-2 text-sm font-semibold text-white shadow-xl" style={{ background: "var(--color-brand-600)" }}>
          {toast}
        </div>
      )}

      {/* Cover */}
      <div className="relative h-48 w-full overflow-hidden rounded-3xl md:h-64">
        {group.coverImageUrl ? (
          <img src={group.coverImageUrl} alt={group.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-app-soft text-6xl">👥</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4">
          <Badge tone="gray">{group.isPrivate ? <><Lock size={11} className="mr-1 inline" />私人社團</> : <><Globe size={11} className="mr-1 inline" />公開社團</>}</Badge>
        </div>
        <h1 className="absolute bottom-4 left-4 right-4 font-display text-2xl font-extrabold text-white drop-shadow md:text-3xl">{group.name}</h1>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src={ownerAvatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${group.ownerId}`} alt="" className="h-10 w-10 rounded-full object-cover" />
          <div>
            <p className="text-xs text-soft">建立者</p>
            <p className="font-bold text-main">{ownerName}</p>
          </div>
          <span className="ml-3 flex items-center gap-1 text-sm font-semibold text-brand-600"><Users size={14} /> {memberCount} 位成員</span>
        </div>

        <div className="flex gap-2">
          {isApprovedMember && (
            <Link href={`/events/create?groupId=${id}`} className="btn-coral flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold">
              <PlusCircle size={16} /> 建立社團活動
            </Link>
          )}
          {!isOwner && isApprovedMember && (
            <button onClick={leave} className="flex items-center gap-1.5 rounded-full border border-rose-300 px-4 py-2 text-sm font-bold text-rose-500">
              <LogOut size={14} /> 退出社團
            </button>
          )}
          {(isOwner || isAdmin) && (
            <button onClick={deleteGroup} className="flex items-center gap-1.5 rounded-full border border-rose-300 px-4 py-2 text-sm font-bold text-rose-500">
              <Trash2 size={14} /> 刪除社團
            </button>
          )}
        </div>
      </div>

      <div className="card-surface mt-5 rounded-2xl p-5">
        <h3 className="mb-2 font-display font-bold text-main">社團介紹</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-soft">{group.description}</p>
      </div>

      {isApprovedMember && (
        <InviteCodePanel groupId={id} initialCode={inviteCode} isOwner={isOwner} isAdmin={isAdmin} showToast={showToast} />
      )}

      {!isApprovedMember ? (
        <div className="mt-6 flex flex-col gap-4">
          <JoinByCodeBox showToast={showToast} onJoined={load} />
          <div className="flex items-center gap-3 text-xs text-soft">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            或
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          {!isOwner && myMembership?.status !== "pending" && (
            <button onClick={requestJoin} className="btn-brand flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold">
              <Send size={14} /> 沒有代碼？送出加入申請給建立者審核
            </button>
          )}
          {!isOwner && myMembership?.status === "pending" && (
            <p className="text-center text-sm font-semibold text-soft">您的加入申請正在等候審核中...</p>
          )}
          <EmptyState icon="🔒" title="加入社團後即可查看社團專屬活動與成員名單" />
        </div>
      ) : (
        <>          {(isOwner || isAdmin) && pendingMembers.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 font-display font-bold text-amber-600">待審核申請 ({pendingMembers.length})</h3>
              <div className="flex flex-col gap-2">
                {pendingMembers.map((m: any) => (
                  <div key={m.id} className="card-surface flex items-center justify-between rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <img src={m.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${m.userId}`} className="h-9 w-9 rounded-full object-cover" alt="" />
                      <span className="text-sm font-semibold text-main">{m.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => actOnMember(m.id, "approve")} className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"><Check size={12} /> 通過</button>
                      <button onClick={() => actOnMember(m.id, "reject")} className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white"><X size={12} /> 拒絕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="mb-2 font-display font-bold text-main">社團專屬活動</h3>
            {events === null ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
            ) : events.length === 0 ? (
              <EmptyState icon="🎪" title="社團內還沒有任何活動" subtitle="快建立第一場社團專屬活動吧！" />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((e: any) => <EventCard key={e.id} event={e} />)}
              </div>
            )}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 font-display font-bold text-main">成員名單 ({members.length})</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {members.map((m: any) => (
                <Link key={m.id} href={`/profile/${m.userId}`} className="card-surface flex items-center gap-2 rounded-xl p-2.5 transition hover:-translate-y-0.5">
                  <img src={m.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${m.userId}`} className="h-8 w-8 shrink-0 rounded-full object-cover" alt="" />
                  <span className="truncate text-xs font-semibold text-main">{m.name}</span>
                  {m.role === "owner" && <Badge tone="coral">建立者</Badge>}
                  {(isOwner || isAdmin) && m.role !== "owner" && (
                    <button onClick={() => actOnMember(m.id, "remove")} title="移除成員" className="ml-auto shrink-0 rounded-full p-1 text-rose-400 hover:bg-rose-500/10">
                      <X size={12} />
                    </button>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InviteCodePanel({ groupId, initialCode, isOwner, isAdmin, showToast }: any) {
  const [code, setCode] = useState(initialCode);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures
    }
  }

  async function regenerate() {
    if (!confirm("重新產生後，舊的邀請代碼將立即失效，確定要繼續嗎？")) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invite-code`, { method: "POST" });
      const d = await res.json();
      if (res.ok) { setCode(d.inviteCode); showToast("已產生新的邀請代碼"); } else showToast(d.error);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card-surface mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-brand-300/60 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
          <KeyRound size={20} />
        </div>
        <div>
          <p className="text-xs text-soft">邀請代碼（分享給朋友即可立即加入）</p>
          <p className="font-mono text-lg font-bold tracking-wider text-main">{code}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={copy} className="btn-brand flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "已複製" : "複製代碼"}
        </button>
        {(isOwner || isAdmin) && (
          <button disabled={regenerating} onClick={regenerate} className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-bold text-main disabled:opacity-50">
            {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} 重新產生
          </button>
        )}
      </div>
    </div>
  );
}

function JoinByCodeBox({ showToast, onJoined }: { showToast: (msg: string) => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/groups/join-by-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok) { showToast(d.message); onJoined(); } else showToast(d.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-surface flex flex-col gap-3 rounded-2xl p-5 text-center">
      <p className="flex items-center justify-center gap-1.5 font-display font-bold text-main"><KeyRound size={18} className="text-brand-600" /> 有邀請代碼嗎？</p>
      <p className="text-xs text-soft">輸入建立者提供的邀請代碼，即可立即加入社團</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="例如：GRP-XXXXXXXX"
          className="flex-1 rounded-xl border border-[var(--color-border)] bg-app px-4 py-2.5 text-sm uppercase tracking-wider text-main outline-none"
        />
        <button disabled={loading || !code.trim()} onClick={submit} className="btn-coral flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />} 加入
        </button>
      </div>
    </div>
  );
}