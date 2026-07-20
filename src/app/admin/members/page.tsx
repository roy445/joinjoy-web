"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, CreditBadge, BlacklistBadge, Badge } from "@/components/ui";
import { Search, Ban, ShieldCheck, Gift } from "lucide-react";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<any>(null);
  const [reason, setReason] = useState("");

  function load() {
    fetch(`/api/admin/members?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => setMembers(d.members || []));
  }
  useEffect(() => { load(); }, []);

  async function act(userId: number, action: string, extra?: any) {
    const res = await fetch("/api/admin/members", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action, ...extra }) });
    if (res.ok) { load(); setSuspendTarget(null); setReason(""); }
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="會員管理" />

      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-app-soft px-3 py-2.5">
          <Search size={16} className="text-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="搜尋姓名或 Email" className="w-full bg-transparent text-sm outline-none" />
        </div>
        <button onClick={load} className="btn-brand rounded-xl px-4 py-2.5 text-sm font-bold">搜尋</button>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
            <Link href={`/profile/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <img src={m.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${m.id}`} className="h-10 w-10 rounded-full object-cover" alt="" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-main">{m.name} {m.role === "admin" && <Badge tone="coral">管理員</Badge>}</p>
                <p className="truncate text-xs text-soft">{m.email}</p>
              </div>
            </Link>
            <CreditBadge score={m.creditScore} />
            {m.isBlacklisted && <BlacklistBadge />}
            {m.status === "suspended" ? (
              <Badge tone="rose">已停權</Badge>
            ) : (
              <Badge tone="brand">正常</Badge>
            )}
            <div className="flex gap-1.5">
              {m.status === "suspended" ? (
                <button onClick={() => act(m.id, "unsuspend")} className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600"><ShieldCheck size={12} /> 解除停權</button>
              ) : (
                <button onClick={() => setSuspendTarget(m)} className="flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500"><Ban size={12} /> 停權</button>
              )}
              <button onClick={() => act(m.id, "grant_credit")} className="flex items-center gap-1 rounded-full bg-coral-500/10 px-3 py-1.5 text-xs font-bold text-coral-600"><Gift size={12} /> +1 建立權限</button>
            </div>
          </div>
        ))}
      </div>

      {suspendTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6">
            <h3 className="font-display font-bold text-main">停權 {suspendTarget.name}</h3>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="停權原因" className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setSuspendTarget(null)} className="flex-1 rounded-xl border border-[var(--color-border)] py-2 text-sm font-bold">取消</button>
              <button onClick={() => act(suspendTarget.id, "suspend", { reason })} className="flex-1 rounded-xl bg-rose-500 py-2 text-sm font-bold text-white">確認停權</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
