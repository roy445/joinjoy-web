"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Plus, Ban, Copy } from "lucide-react";

export default function AdminCodesPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [count, setCount] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    fetch("/api/admin/codes").then((r) => r.json()).then((d) => setCodes(d.codes || []));
  }
  useEffect(() => { load(); }, []);

  async function generate() {
    setCreating(true);
    try {
      await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, expiresInDays: expiresInDays ? Number(expiresInDays) : null }),
      });
      load();
    } finally { setCreating(false); }
  }

  async function revoke(id: number) {
    await fetch(`/api/admin/codes?id=${id}`, { method: "DELETE" });
    load();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="一次性建立活動代碼" />

      <div className="card-surface flex flex-wrap items-end gap-4 rounded-2xl p-5">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">產生數量</span>
          <input type="number" min={1} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-24 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">有效天數（留空為永久）</span>
          <input type="number" min={1} value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} className="w-36 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
        </label>
        <button disabled={creating} onClick={generate} className="btn-brand flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold">
          <Plus size={16} /> 產生代碼
        </button>
      </div>

      {codes.length === 0 ? <EmptyState icon="🔑" title="尚未產生任何代碼" /> : (
        <div className="flex flex-col gap-2">
          {codes.map((c) => (
            <div key={c.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <code className="rounded-lg bg-app-soft px-3 py-1.5 font-mono text-sm font-bold text-main">{c.code}</code>
              <button onClick={() => copyCode(c.code)} className="rounded-full p-1.5 text-soft hover:text-brand-600"><Copy size={14} /></button>
              <div className="flex-1" />
              {c.revoked ? <Badge tone="rose">已撤銷</Badge> : c.usedBy ? <Badge tone="gray">已使用（{c.usedByName}）</Badge> : <Badge tone="brand">可使用</Badge>}
              <span className="text-xs text-soft">建立於 {timeAgo(c.createdAt)}</span>
              {!c.revoked && !c.usedBy && (
                <button onClick={() => revoke(c.id)} className="flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500"><Ban size={12} /> 撤銷</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
