"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, X } from "lucide-react";

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  function load() {
    fetch("/api/admin/reports").then((r) => r.json()).then((d) => setReports(d.reports || []));
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: string) {
    await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }

  const statusLabel: Record<string, string> = { pending: "待處理", resolved: "已處理", rejected: "不成立" };
  const statusTone: Record<string, any> = { pending: "coral", resolved: "brand", rejected: "gray" };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="檢舉案件處理" />
      {reports.length === 0 ? <EmptyState icon="🚩" title="目前沒有檢舉案件" /> : (
        <div className="flex flex-col gap-2">
          {reports.map((r) => (
            <div key={r.id} className="card-surface flex flex-wrap items-start gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-main">
                  {r.type === "event" ? "活動檢舉" : r.type === "comment" ? "留言檢舉" : "聊天室檢舉"}：{r.eventTitle}
                </p>
                <p className="mt-1 text-sm text-soft">檢舉人：{r.reporterName} · 原因：{r.reason}</p>
                {r.description && <p className="mt-1 text-sm text-main">{r.description}</p>}
                <p className="mt-1 text-xs text-soft">{timeAgo(r.createdAt)}</p>
              </div>
              <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
              {r.eventId && <Link href={`/events/${r.eventId}`} className="text-xs font-semibold text-brand-600 hover:underline">查看活動</Link>}
              {r.status === "pending" && (
                <div className="flex gap-1.5">
                  <button onClick={() => act(r.id, "resolve")} className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"><Check size={12} /> 查證屬實</button>
                  <button onClick={() => act(r.id, "reject")} className="flex items-center gap-1 rounded-full bg-gray-400 px-3 py-1.5 text-xs font-bold text-white"><X size={12} /> 不成立</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
