"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Check, X } from "lucide-react";

export default function AdminAppealsPage() {
  const [appeals, setAppeals] = useState<any[]>([]);

  function load() {
    fetch("/api/admin/appeals").then((r) => r.json()).then((d) => setAppeals(d.appeals || []));
  }
  useEffect(() => { load(); }, []);

  async function act(id: number, action: string) {
    await fetch("/api/admin/appeals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    load();
  }

  const statusLabel: Record<string, string> = { pending: "待審核", resolved: "已核准", rejected: "已駁回" };
  const statusTone: Record<string, any> = { pending: "coral", resolved: "brand", rejected: "gray" };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="帳號申訴審核" />
      {appeals.length === 0 ? <EmptyState icon="🙋" title="目前沒有帳號申訴" /> : (
        <div className="flex flex-col gap-2">
          {appeals.map((a) => (
            <div key={a.id} className="card-surface flex flex-wrap items-start gap-3 rounded-2xl p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-main">
                  <Link href={`/profile/${a.userId}`} className="text-brand-600 hover:underline">{a.userName}</Link>
                  {" "}提出{a.type === "suspend" ? "停權" : "黑名單"}申訴
                </p>
                <p className="mt-1 text-sm text-soft">
                  目前狀態：{a.type === "suspend" ? (a.userStatus === "suspended" ? `停權中（${a.userSuspendReason || "無說明"}）` : "已恢復正常") : (a.userIsBlacklisted ? "黑名單中" : "已移出黑名單")}
                </p>
                <p className="mt-1 text-sm text-main">{a.message}</p>
                <p className="mt-1 text-xs text-soft">{timeAgo(a.createdAt)}</p>
              </div>
              <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
              {a.status === "pending" && (
                <div className="flex gap-1.5">
                  <button onClick={() => act(a.id, "approve")} className="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white"><Check size={12} /> 核准申訴</button>
                  <button onClick={() => act(a.id, "reject")} className="flex items-center gap-1 rounded-full bg-gray-400 px-3 py-1.5 text-xs font-bold text-white"><X size={12} /> 駁回</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
