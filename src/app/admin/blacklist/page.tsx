"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, X, ShieldOff } from "lucide-react";

export default function AdminBlacklistPage() {
  const [data, setData] = useState<any>({ requests: [], activeList: [] });
  const [tab, setTab] = useState<"requests" | "active">("requests");

  function load() {
    fetch("/api/admin/blacklist").then((r) => r.json()).then(setData);
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: string) {
    await fetch("/api/admin/blacklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }

  async function removeFromBlacklist(id: number) {
    await fetch(`/api/admin/blacklist?id=${id}`, { method: "DELETE" });
    load();
  }

  const statusLabel: Record<string, string> = { pending: "待審核", approved: "已核准", rejected: "已駁回" };
  const statusTone: Record<string, any> = { pending: "coral", approved: "rose", rejected: "gray" };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="黑名單管理" />

      <div className="flex gap-2 rounded-full bg-app-soft p-1 w-fit">
        <button onClick={() => setTab("requests")} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === "requests" ? "bg-brand-500 text-white" : "text-soft"}`}>揪主申請 ({data.requests.length})</button>
        <button onClick={() => setTab("active")} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === "active" ? "bg-brand-500 text-white" : "text-soft"}`}>目前黑名單 ({data.activeList.length})</button>
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
                <button onClick={() => removeFromBlacklist(b.id)} className="flex items-center gap-1 rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-600"><ShieldOff size={12} /> 移出黑名單</button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
