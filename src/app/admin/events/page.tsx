"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { formatDate, eventStatusLabel } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);

  function load() {
    fetch("/api/admin/events").then((r) => r.json()).then((d) => setEvents(d.events || []));
  }
  useEffect(() => { load(); }, []);

  async function remove(id: number) {
    if (!confirm("確定要刪除此活動嗎？")) return;
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="活動管理" />
      {events.length === 0 ? <EmptyState icon="🎪" title="目前沒有活動" /> : (
        <div className="flex flex-col gap-2">
          {events.map((e) => (
            <div key={e.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <img src={e.coverImageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <Link href={`/events/${e.id}`} className="truncate font-semibold text-main hover:underline">{e.title}</Link>
                <p className="text-xs text-soft">主辦人：{e.hostName} · {formatDate(e.eventDate)} · {e.participantCount} 人參加</p>
              </div>
              <Badge tone={e.status === "cancelled" ? "rose" : "brand"}>{eventStatusLabel(e.status)}</Badge>
              {e.isPrivate && <Badge tone="gray">私人</Badge>}
              <button onClick={() => remove(e.id)} className="flex items-center gap-1 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500"><Trash2 size={12} /> 刪除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
