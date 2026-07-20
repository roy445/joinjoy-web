"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { EventCard } from "@/components/event-card";
import { formatDate, eventStatusLabel } from "@/lib/utils";
import { PlusCircle } from "lucide-react";

export default function MyEventsPage() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"hosting" | "joined" | "requests">("hosting");

  useEffect(() => {
    fetch("/api/my-events").then((r) => (r.ok ? r.json() : null)).then(setData);
  }, []);

  if (!data) return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-soft">請先登入以查看我的活動</div>;

  const statusMap: Record<string, string> = { pending: "待審核", approved: "已核准", rejected: "已駁回" };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle
        eyebrow="MY EVENTS"
        title="我的活動"
        action={<Link href="/events/create" className="btn-coral flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold"><PlusCircle size={16} /> 建立活動</Link>}
      />

      <div className="card-surface flex flex-wrap items-center gap-4 rounded-2xl p-4 text-sm">
        <span className="text-soft">建立活動權限：</span>
        {data.createPermission.isAdmin ? <Badge tone="brand">管理員（不限次數）</Badge> : data.createPermission.canCreateEvent ? <Badge tone="brand">信任揪主（不限次數）</Badge> : <Badge tone={data.createPermission.credits > 0 ? "brand" : "gray"}>剩餘 {data.createPermission.credits} 次</Badge>}
      </div>

      <div className="flex gap-2 rounded-full bg-app-soft p-1 w-fit">
        {[{ key: "hosting", label: `主辦中 (${data.hosting.length})` }, { key: "joined", label: `已報名 (${data.joined.length})` }, { key: "requests", label: `申請紀錄 (${data.requests.length})` }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as any)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === t.key ? "bg-brand-500 text-white" : "text-soft"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "hosting" && (
        data.hosting.length === 0 ? <EmptyState icon="🎪" title="還沒有主辦過活動" subtitle="快去建立你的第一場活動吧！" /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.hosting.map((e: any) => <EventCard key={e.id} event={{ ...e, hostName: "我", participantCount: Number(e.participantCount) }} />)}
          </div>
        )
      )}

      {tab === "joined" && (
        data.joined.length === 0 ? <EmptyState icon="🙌" title="還沒有報名任何活動" /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.joined.map((e: any) => (
              <div key={e.id} className="relative">
                <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-[11px] font-bold text-brand-700">
                  {e.myStatus === "approved" ? "已確認" : e.myStatus === "pending" ? "審核中" : "候補中"}
                </span>
                <EventCard event={{ ...e, participantCount: Number(e.participantCount) }} />
              </div>
            ))}
          </div>
        )
      )}

      {tab === "requests" && (
        data.requests.length === 0 ? <EmptyState icon="📝" title="尚無建立活動申請紀錄" /> : (
          <div className="flex flex-col gap-2">
            {data.requests.map((r: any) => (
              <div key={r.id} className="card-surface flex items-center justify-between rounded-2xl p-4">
                <div>
                  <p className="text-sm text-main">{r.reason}</p>
                  <p className="text-xs text-soft">{formatDate(new Date(r.createdAt).toISOString().slice(0, 10))}</p>
                </div>
                <Badge tone={r.status === "approved" ? "brand" : r.status === "rejected" ? "rose" : "gray"}>{statusMap[r.status]}</Badge>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
