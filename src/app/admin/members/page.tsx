"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, CreditBadge, BlacklistBadge, Badge } from "@/components/ui";
import { Ban, CalendarClock, Check, Gift, Search, ShieldCheck, Sparkles, X } from "lucide-react";

type Group = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  effect: string | null;
  description: string | null;
  dailyAiLimit: number;
  jCoinBonus: number;
  isActive: boolean;
};

type Membership = {
  membershipId: number;
  groupId: number;
  groupName: string | null;
  groupIcon: string | null;
  groupColor: string | null;
  groupEffect: string | null;
  expiresAt: string | null;
};

type Member = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  creditScore: string | number;
  isBlacklisted: boolean;
  status: string;
  groups: Membership[];
};

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<Member | null>(null);
  const [groupTarget, setGroupTarget] = useState<Member | null>(null);
  const [reason, setReason] = useState("");
  const [groupReason, setGroupReason] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [groupError, setGroupError] = useState("");
  const [groupSuccess, setGroupSuccess] = useState("");

  async function loadMembers() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/members?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "無法載入會員列表");
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "無法載入會員列表");
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    setGroupsLoading(true);
    try {
      const response = await fetch("/api/admin/groups", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "無法載入身份組");
      setGroups(Array.isArray(data) ? data.filter((group: Group) => group.isActive) : []);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "無法載入身份組");
    } finally {
      setGroupsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMembers();
      void loadGroups();
    }, 0);
    return () => window.clearTimeout(timer);
    // The initial request intentionally runs once; search submits explicitly refresh the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(userId: number, action: string, extra?: Record<string, unknown>) {
    const response = await fetch("/api/admin/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, ...extra }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setPageError(data?.error || "操作失敗");
      return;
    }
    await loadMembers();
    setSuspendTarget(null);
    setReason("");
  }

  function openGroupModal(member: Member) {
    setGroupTarget(member);
    setSelectedGroupId("");
    setGroupReason("");
    setExpiresAt("");
    setGroupError("");
    setGroupSuccess("");
  }

  function closeGroupModal() {
    if (savingGroup) return;
    setGroupTarget(null);
    setGroupError("");
    setGroupSuccess("");
  }

  async function submitGroupGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupTarget) return;
    const groupId = Number(selectedGroupId);
    if (!Number.isSafeInteger(groupId) || groupId <= 0) {
      setGroupError("請選擇要授予的身份組");
      return;
    }
    if (groupReason.trim().length < 2) {
      setGroupError("授予原因至少需要 2 個字");
      return;
    }

    setSavingGroup(true);
    setGroupError("");
    setGroupSuccess("");
    try {
      const response = await fetch("/api/admin/groups/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: groupTarget.id,
          groupId,
          reason: groupReason.trim(),
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "身份組授予失敗");

      setGroupSuccess(`已授予「${data.groupName || "身份組"}」，下次登入會顯示一次性恭喜通知。`);
      setSelectedGroupId("");
      setGroupReason("");
      setExpiresAt("");
      await loadMembers();
    } catch (err) {
      setGroupError(err instanceof Error ? err.message : "身份組授予失敗");
    } finally {
      setSavingGroup(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle eyebrow="ADMIN" title="會員管理" />
        <p className="text-xs font-bold text-soft">身份授予、J 幣與帳號操作都會留下管理員紀錄</p>
      </div>

      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-app-soft px-3 py-2.5">
          <Search size={16} className="text-soft" />
          <input value={q} onChange={(event) => setQ(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void loadMembers()} placeholder="搜尋姓名或 Email" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <button type="button" onClick={() => void loadMembers()} className="btn-brand rounded-xl px-4 py-2.5 text-sm font-bold">搜尋</button>
      </div>

      {pageError && <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{pageError}</div>}

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : members.length === 0 ? (
          <div className="rounded-2xl bg-app-soft px-4 py-12 text-center text-sm font-bold text-soft">找不到符合條件的會員。</div>
        ) : members.map((member) => (
          <div key={member.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <Link href={`/profile/${member.id}`} className="flex min-w-[220px] flex-1 items-center gap-3">
              <img src={member.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${member.id}`} className="h-10 w-10 rounded-full object-cover" alt="" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-main">{member.name} {member.role === "admin" && <Badge tone="coral">管理員</Badge>}</p>
                <p className="truncate text-xs text-soft">{member.email}</p>
                <p className="mt-1 text-[10px] font-bold text-soft">UID {member.id}</p>
              </div>
            </Link>

            <div className="flex min-w-[180px] flex-1 flex-wrap gap-1.5">
              {member.groups?.length ? member.groups.map((group) => (
                <span key={group.membershipId} title={group.groupEffect || undefined} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black" style={{ borderColor: group.groupColor || "#d6e8df", color: group.groupColor || "#247a57", backgroundColor: `${group.groupColor || "#247a57"}12` }}>
                  <span>{group.groupIcon || "✦"}</span>{group.groupName || "身份組"}
                  {group.expiresAt && <span className="font-bold opacity-75">· {new Date(group.expiresAt).toLocaleDateString("zh-TW")}</span>}
                </span>
              )) : <span className="text-xs font-bold text-soft">尚未設定身份組</span>}
            </div>

            <CreditBadge score={member.creditScore} />
            {member.isBlacklisted && <BlacklistBadge />}
            {member.status === "suspended" ? <Badge tone="rose">已停權</Badge> : <Badge tone="brand">正常</Badge>}

            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => openGroupModal(member)} className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-500/20"><Sparkles size={12} /> 授予身份組</button>
              {member.status === "suspended" ? (
                <button type="button" onClick={() => void act(member.id, "unsuspend")} className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600"><ShieldCheck size={12} /> 解除停權</button>
              ) : (
                <button type="button" onClick={() => setSuspendTarget(member)} className="flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500"><Ban size={12} /> 停權</button>
              )}
              <button type="button" onClick={() => void act(member.id, "grant_credit")} className="flex items-center gap-1 rounded-full bg-coral-500/10 px-3 py-1.5 text-xs font-bold text-coral-600"><Gift size={12} /> +1 建立權限</button>
            </div>
          </div>
        ))}
      </div>

      {suspendTarget && (
        <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-center justify-center py-6">
            <div className="w-full max-w-sm rounded-3xl border-2 border-rose-200 bg-white p-6 shadow-2xl">
              <h3 className="font-display font-bold text-main">停權 {suspendTarget.name}</h3>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="停權原因" className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setSuspendTarget(null)} className="flex-1 rounded-xl border border-[var(--color-border)] py-2 text-sm font-bold">取消</button>
                <button type="button" onClick={() => void act(suspendTarget.id, "suspend", { reason })} className="flex-1 rounded-xl bg-rose-500 py-2 text-sm font-bold text-white">確認停權</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {groupTarget && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4" role="presentation">
          <div className="flex min-h-full items-center justify-center py-6">
            <form onSubmit={submitGroupGrant} className="w-full max-w-lg rounded-3xl border-4 border-brand-500 bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="grant-group-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">IDENTITY GRANT</p>
                  <h2 id="grant-group-title" className="mt-1 text-2xl font-black text-main">授予身份組</h2>
                  <p className="mt-1 text-sm font-bold text-soft">對象：{groupTarget.name}（UID {groupTarget.id}）</p>
                </div>
                <button type="button" onClick={closeGroupModal} className="rounded-full p-2 text-soft transition hover:bg-app-soft hover:text-main" aria-label="關閉"><X size={20} /></button>
              </div>

              <label className="mt-6 block text-sm font-black text-main">
                選擇身份組
                <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)} disabled={groupsLoading} className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 font-bold text-main outline-none focus:border-brand-500" required>
                  <option value="">{groupsLoading ? "載入身份組中…" : "請選擇啟用中的身份組"}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.icon || "✦"} {group.name} · AI {group.dailyAiLimit}/日 · J 幣 +{group.jCoinBonus}%</option>
                  ))}
                </select>
              </label>

              <label className="mt-5 block text-sm font-black text-main">
                授予原因（必填）
                <textarea value={groupReason} onChange={(event) => setGroupReason(event.target.value)} rows={3} maxLength={1000} className="mt-2 w-full resize-y rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="例如：完成本月社群志工任務" required />
              </label>

              <label className="mt-5 block text-sm font-black text-main">
                到期時間（選填）
                <div className="relative mt-2">
                  <CalendarClock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-soft" />
                  <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 pl-10 text-sm font-bold text-main outline-none focus:border-brand-500" />
                </div>
                <span className="mt-1 block text-xs font-bold text-soft">留白代表永久有效；授予與撤銷歷史不會被刪除。</span>
              </label>

              {selectedGroupId && (
                <div className="mt-5 flex items-start gap-3 rounded-2xl border-2 border-brand-100 bg-brand-50 p-4 text-sm font-bold text-brand-800">
                  <Check size={18} className="mt-0.5 shrink-0" />
                  <span>授予後，使用者下次登入會看到一次性的恭喜通知；同一筆通知只會被標記為已讀一次。</span>
                </div>
              )}
              {groupError && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{groupError}</p>}
              {groupSuccess && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" role="status">{groupSuccess}</p>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={closeGroupModal} disabled={savingGroup} className="flex-1 rounded-xl border-2 border-brand-100 py-3 text-sm font-black text-main transition hover:bg-app-soft disabled:opacity-50">關閉</button>
                <button type="submit" disabled={savingGroup || groupsLoading} className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{savingGroup ? "授予中…" : "確認授予"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
