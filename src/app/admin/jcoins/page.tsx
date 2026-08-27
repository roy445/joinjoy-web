"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { ShoppingBag, ArrowUpRight, ArrowDownLeft, User, Search, Filter } from "lucide-react";
import { JCoin } from "@/components/j-coin";

export default function AdminJCoinsPage() {
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/jcoins/transactions")
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setTxs(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="skeleton h-96 rounded-3xl animate-pulse" />;

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="AUDIT" title="J幣審計與交易紀錄" />

      <div className="card-surface rounded-[2rem] p-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-soft" size={18} />
            <input 
              type="text" 
              placeholder="搜尋使用者 ID 或原因..." 
              className="w-full rounded-2xl bg-app-soft py-3 pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <button className="flex items-center gap-2 rounded-2xl bg-app-soft px-5 py-3 text-sm font-bold text-soft hover:text-main transition">
            <Filter size={18} /> 篩選條件
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-soft font-bold">
                <th className="pb-4 pr-4">交易時間</th>
                <th className="pb-4 pr-4">使用者</th>
                <th className="pb-4 pr-4">類型</th>
                <th className="pb-4 pr-4 text-right">金額</th>
                <th className="pb-4">原因</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {txs.map((tx) => (
                <tr key={tx.id} className="group hover:bg-app-soft/50 transition-colors">
                  <td className="py-4 pr-4 text-soft whitespace-nowrap">{new Date(tx.createdAt).toLocaleString()}</td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
                        <User size={14} />
                      </div>
                      <span className="font-bold text-main">UID: {tx.userId}</span>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                      tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 
                      tx.type === 'spend' ? 'bg-coral-50 text-coral-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {tx.type === 'earn' ? '獲得' : tx.type === 'spend' ? '消耗' : '人工調整'}
                    </span>
                  </td>
                  <td className={`py-4 pr-4 text-right font-black text-lg ${tx.amount > 0 ? 'text-emerald-600' : 'text-coral-600'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {tx.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      {Math.abs(tx.amount)}
                      <JCoin size={16} />
                    </div>
                  </td>
                  <td className="py-4 text-main font-bold">{tx.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
