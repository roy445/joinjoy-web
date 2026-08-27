"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { ShieldCheck, Plus, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/groups")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setGroups(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="skeleton h-96 rounded-3xl animate-pulse" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <SectionTitle eyebrow="IDENTITY" title="身份組管理" />
        <button className="btn-brand flex items-center gap-2 rounded-2xl px-6 py-3 font-black shadow-lg shadow-brand-500/20">
          <Plus size={20} /> 建立新身份組
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id} className="card-surface group overflow-hidden rounded-[2rem] border-2 border-transparent hover:border-brand-100 transition-all">
            <div className="h-2 w-full" style={{ backgroundColor: group.color || '#10b981' }} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{group.icon || '🛡️'}</span>
                  <h3 className="text-xl font-black text-main">{group.name}</h3>
                </div>
                {group.isActive ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                    <CheckCircle2 size={10} /> 啟用中
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-black text-soft bg-app-soft px-2 py-1 rounded-lg uppercase tracking-wider">
                    <XCircle size={10} /> 已停用
                  </span>
                )}
              </div>
              
              <p className="text-sm font-bold text-soft line-clamp-2 min-h-[2.5rem]">{group.description || '無描述'}</p>
              
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-app-soft p-3 text-center">
                  <p className="text-[10px] font-black text-soft uppercase">AI 額度</p>
                  <p className="text-lg font-black text-main">{group.dailyAiLimit}</p>
                </div>
                <div className="rounded-xl bg-app-soft p-3 text-center">
                  <p className="text-[10px] font-black text-soft uppercase">J幣加成</p>
                  <p className="text-lg font-black text-brand-600">+{group.jCoinBonus}%</p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-2 border-t border-brand-50 pt-6">
                <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-app-soft py-3 text-sm font-bold text-main transition hover:bg-brand-50 hover:text-brand-600">
                  <Edit2 size={16} /> 編輯
                </button>
                <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-soft text-soft transition hover:bg-coral-50 hover:text-coral-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
