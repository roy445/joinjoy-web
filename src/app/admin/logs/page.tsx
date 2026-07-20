"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/logs").then((r) => r.json()).then((d) => setLogs(d.logs || []));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="操作日誌" />
      {logs.length === 0 ? <EmptyState icon="📜" title="尚無操作紀錄" /> : (
        <div className="card-surface overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="bg-app-soft text-xs text-soft">
              <tr>
                <th className="px-4 py-3 text-left">時間</th>
                <th className="px-4 py-3 text-left">管理員</th>
                <th className="px-4 py-3 text-left">操作</th>
                <th className="px-4 py-3 text-left">目標</th>
                <th className="px-4 py-3 text-left">詳情</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3 text-xs text-soft">{timeAgo(l.createdAt)}</td>
                  <td className="px-4 py-3 font-semibold text-main">{l.adminName}</td>
                  <td className="px-4 py-3 text-main">{l.action}</td>
                  <td className="px-4 py-3 text-xs text-soft">{l.targetType} {l.targetId ? `#${l.targetId}` : ""}</td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-xs text-soft">{l.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
