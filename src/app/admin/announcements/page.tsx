"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Send, Trash2 } from "lucide-react";

export default function AdminAnnouncementsPage() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    fetch("/api/admin/announcements").then((r) => r.json()).then((d) => setList(d.announcements || []));
  }
  useEffect(() => { load(); }, []);

  async function send() {
    setSending(true);
    try {
      const res = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, content }) });
      if (res.ok) { setTitle(""); setContent(""); load(); }
    } finally { setSending(false); }
  }

  async function remove(id: number) {
    await fetch(`/api/admin/announcements?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="全站公告" />

      <div className="card-surface flex flex-col gap-3 rounded-2xl p-5">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="公告標題" className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none" />
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="公告內容，將發送給所有會員" className="rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none" />
        <button disabled={sending || !title || !content} onClick={send} className="btn-coral flex items-center justify-center gap-2 self-end rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          <Send size={14} /> 發送全站公告
        </button>
      </div>

      {list.length === 0 ? <EmptyState icon="📢" title="尚無公告紀錄" /> : (
        <div className="flex flex-col gap-2">
          {list.map((a) => (
            <div key={a.id} className="card-surface flex items-start justify-between gap-3 rounded-2xl p-4">
              <div>
                <p className="font-semibold text-main">{a.title} {!a.isActive && <Badge tone="gray">已下架</Badge>}</p>
                <p className="mt-1 text-sm text-soft">{a.content}</p>
                <p className="mt-1 text-xs text-soft">{timeAgo(a.createdAt)}</p>
              </div>
              {a.isActive && <button onClick={() => remove(a.id)} className="shrink-0 rounded-full bg-rose-500/10 p-2 text-rose-500"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
