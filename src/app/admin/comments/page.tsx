"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);

  function load() {
    fetch("/api/admin/comments").then((r) => r.json()).then((d) => setComments(d.comments || []));
  }
  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    await fetch(`/api/admin/comments?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="留言管理" />
      {comments.length === 0 ? <EmptyState icon="💬" title="目前沒有留言" /> : (
        <div className="flex flex-col gap-2">
          {comments.map((c) => (
            <div key={c.id} className="card-surface flex items-start justify-between gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-soft">{c.userName} 於「{c.eventTitle}」· {timeAgo(c.createdAt)}</p>
                <p className={`mt-1 text-sm ${c.isDeleted ? "text-soft line-through" : "text-main"}`}>{c.content}</p>
              </div>
              {!c.isDeleted && (
                <button onClick={() => remove(c.id)} className="flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500"><Trash2 size={12} /> 刪除</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
