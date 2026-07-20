"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, X } from "lucide-react";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);

  function load() {
    fetch("/api/admin/requests").then((r) => r.json()).then((d) => setRequests(d.requests || []));
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: string) {
    await fetch("/api/admin/requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }

  const statusLabel: Record<string, string> = { pending: "待審核", approved: "已核准", rejected: "已駁回" };
  const statusTone: Record<string, any> = { pending: "coral", approved: "brand", rejected: "rose" };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="建立活動申請審核" />
      {requests.length === 0 ? <EmptyState icon="📋" title="目前沒有申請紀錄" /> : (
        <div className="flex flex-col gap-2">
          {requests.map((r) => (
            <div key={r.id} className="card-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-main">{r.userName} <span className="font-normal text-soft">（{r.userEmail}）</span></p>
                <p className="mt-1 text-sm text-soft">{r.reason}</p>
                <p className="mt-1 text-xs text-soft">{timeAgo(r.createdAt)}</p>
              </div>
              <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
              {r.status === "pending" && (
                <div className="flex gap-1.5">
                  <button onClick={() => act(r.id, "approve")} className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"><Check size={12} /> 核准</button>
                  <button onClick={() => act(r.id, "reject")} className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white"><X size={12} /> 駁回</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
