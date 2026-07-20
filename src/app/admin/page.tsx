"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { Users, CalendarDays, Ban, ShieldBan, Activity, Flag, ShieldAlert, ClipboardCheck, ShieldQuestion } from "lucide-react";

function StatBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-main">{value}</p>
        <p className="text-xs text-soft">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)).then(setStats);
  }, []);

  if (!stats) return <div className="skeleton h-64 rounded-2xl" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="管理總覽" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock icon={<Users size={18} />} label="總會員數" value={stats.userCount} />
        <StatBlock icon={<CalendarDays size={18} />} label="總活動數" value={stats.eventCount} />
        <StatBlock icon={<Activity size={18} />} label="今日活躍人數" value={stats.activeToday} />
        <StatBlock icon={<Ban size={18} />} label="已停權會員" value={stats.suspendedCount} />
        <StatBlock icon={<ShieldBan size={18} />} label="黑名單人數" value={stats.blacklistedCount} />
        <StatBlock icon={<Flag size={18} />} label="待處理檢舉" value={stats.pendingReports} />
        <StatBlock icon={<ShieldAlert size={18} />} label="待審黑名單申請" value={stats.pendingBlacklist} />
        <StatBlock icon={<ClipboardCheck size={18} />} label="待審建立活動申請" value={stats.pendingRequests} />
        <StatBlock icon={<ShieldQuestion size={18} />} label="待審帳號申訴" value={stats.pendingAppeals} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card-surface rounded-2xl p-5">
          <h3 className="mb-3 font-display font-bold text-main">熱門地區分布</h3>
          <div className="flex flex-col gap-2">
            {stats.regionStats.filter((r: any) => r.name).map((r: any) => (
              <div key={r.name} className="flex items-center justify-between text-sm">
                <span className="text-soft">{r.name}</span>
                <span className="font-bold text-main">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface rounded-2xl p-5">
          <h3 className="mb-3 font-display font-bold text-main">活動狀態分布</h3>
          <div className="flex flex-col gap-2">
            {stats.statusStats.map((s: any) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <span className="text-soft">{s.status}</span>
                <span className="font-bold text-main">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-surface rounded-2xl p-5">
        <h3 className="mb-3 font-display font-bold text-main">近期註冊趨勢</h3>
        <div className="flex items-end gap-1.5" style={{ height: 100 }}>
          {stats.dailySignups.map((d: any) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-md bg-brand-400" style={{ height: `${Math.max(4, d.count * 14)}px` }} />
              <span className="text-[9px] text-soft">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
