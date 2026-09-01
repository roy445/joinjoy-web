"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { Brain, Zap, AlertCircle, Clock, BarChart3, PieChart } from "lucide-react";

function AIStatCard({ label, value, subValue, icon, colorClass }: any) {
  return (
    <div className="card-surface flex flex-col gap-2 rounded-2xl p-6 border-2 border-transparent hover:border-brand-100 transition-all">
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colorClass}`}>
          {icon}
        </div>
        <span className="text-3xl font-black text-main">{value}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-soft uppercase tracking-wider">{label}</p>
        {subValue && <p className="text-xs text-brand-600 font-bold">{subValue}</p>}
      </div>
    </div>
  );
}

export default function AdminAIPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setStats(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="skeleton h-96 rounded-3xl animate-pulse" />;
  if (!stats) return <div className="p-10 text-center font-bold text-coral-500">無法載入 AI 統計數據</div>;

  return (
    <div className="flex flex-col gap-8">
      <SectionTitle eyebrow="MONITORING" title="AI 服務監控" />

      {/* Global Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AIStatCard 
          label="今日總請求" 
          value={stats.todayTotal} 
          subValue={`較昨日 ${stats.growth > 0 ? '+' : ''}${stats.growth}%`}
          icon={<Brain size={24} />} 
          colorClass="bg-brand-500/10 text-brand-600"
        />
        <AIStatCard 
          label="平均延遲" 
          value={`${stats.avgLatency}ms`} 
          icon={<Clock size={24} />} 
          colorClass="bg-amber-500/10 text-amber-600"
        />
        <AIStatCard 
          label="成功率" 
          value={`${stats.successRate}%`} 
          icon={<Zap size={24} />} 
          colorClass="bg-emerald-500/10 text-emerald-600"
        />
        <AIStatCard 
          label="今日錯誤數" 
          value={stats.todayErrors} 
          icon={<AlertCircle size={24} />} 
          colorClass="bg-coral-500/10 text-coral-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Provider Distribution */}
        <div className="card-surface rounded-[2rem] p-8">
          <div className="mb-6 flex items-center gap-3">
            <PieChart className="text-brand-500" />
            <h3 className="text-xl font-black text-main">Gemini 使用狀況</h3>
          </div>
          <div className="space-y-4">
            {stats.providers.map((p: any) => (
              <div key={p.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="capitalize text-main">{p.name}</span>
                  <span className="text-soft">{p.share}% ({p.count} 次)</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-app-soft">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      p.name === 'gemini' ? 'bg-blue-500' : 'bg-slate-400'
                    }`} 
                    style={{ width: `${p.share}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tokens Usage */}
        <div className="card-surface rounded-[2rem] p-8">
          <div className="mb-6 flex items-center gap-3">
            <BarChart3 className="text-brand-500" />
            <h3 className="text-xl font-black text-main">Token 消耗統計</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-app-soft p-5 text-center">
              <p className="text-xs font-bold text-soft uppercase">今日 Prompt</p>
              <p className="mt-1 text-2xl font-black text-main">{stats.tokens.prompt.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-app-soft p-5 text-center">
              <p className="text-xs font-bold text-soft uppercase">今日 Completion</p>
              <p className="mt-1 text-2xl font-black text-main">{stats.tokens.completion.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border-2 border-dashed border-brand-100 p-5">
            <p className="text-center text-sm font-bold text-brand-600">
              本月累計預估消耗：{stats.tokens.monthlyTotal.toLocaleString()} Tokens
            </p>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      <div className="card-surface rounded-[2rem] p-8">
        <h3 className="mb-6 text-xl font-black text-main">近期服務異常紀錄</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-soft font-bold">
                <th className="pb-4 pr-4">時間</th>
                <th className="pb-4 pr-4">AI 服務</th>
                <th className="pb-4 pr-4">Model</th>
                <th className="pb-4">錯誤訊息</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {stats.recentErrors.map((err: any, i: number) => (
                <tr key={i} className="group">
                  <td className="py-4 pr-4 text-soft">{new Date(err.time).toLocaleString()}</td>
                  <td className="py-4 pr-4"><span className="rounded-lg bg-coral-50 px-2 py-1 text-[10px] font-black uppercase text-coral-600">{err.provider}</span></td>
                  <td className="py-4 pr-4 font-mono text-xs text-main">{err.model}</td>
                  <td className="py-4 text-coral-600 font-medium">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
