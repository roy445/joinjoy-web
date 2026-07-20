"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState, CreditBadge } from "@/components/ui";
import { Trophy, Flame, Users, Star } from "lucide-react";

function RankList({ items, valueLabel, valueKey }: { items: any[]; valueLabel: string; valueKey: string }) {
  if (!items || items.length === 0) return <EmptyState icon="🏆" title="尚無排行資料" />;
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <Link key={item.id} href={`/profile/${item.id}`} className="card-surface flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
          <span className="w-8 text-center text-lg font-bold text-main">{medals[i] || i + 1}</span>
          <img src={item.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${item.id}`} alt="" className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-main">{item.name || item.title}</p>
            {item.hostName && <p className="truncate text-xs text-soft">主辦人：{item.hostName}</p>}
          </div>
          <span className="shrink-0 text-sm font-bold text-brand-600">{item[valueKey]} {valueLabel}</span>
        </Link>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"hosts" | "active" | "events" | "credit">("hosts");

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then(setData);
  }, []);

  const tabs = [
    { key: "hosts", label: "熱門揪主", icon: Flame },
    { key: "active", label: "活躍會員", icon: Users },
    { key: "events", label: "最多人參加", icon: Trophy },
    { key: "credit", label: "信用最高", icon: Star },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="LEADERBOARD" title="🏆 排行榜" />

      <div className="flex gap-2 overflow-x-auto hide-scrollbar rounded-full bg-app-soft p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key as any)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${tab === t.key ? "bg-brand-500 text-white" : "text-soft"}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {!data ? (
        <div className="skeleton h-64 rounded-2xl" />
      ) : (
        <>
          {tab === "hosts" && <RankList items={data.topHosts} valueLabel="場活動" valueKey="count" />}
          {tab === "active" && <RankList items={data.topActive} valueLabel="次參加" valueKey="count" />}
          {tab === "events" && (
            data.popularEvents.length === 0 ? <EmptyState icon="🎪" title="尚無資料" /> : (
              <div className="flex flex-col gap-2">
                {data.popularEvents.map((e: any, i: number) => (
                  <Link key={e.id} href={`/events/${e.id}`} className="card-surface flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <span className="w-8 text-center text-lg font-bold text-main">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                    <img src={e.coverImageUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-main">{e.title}</p>
                      <p className="truncate text-xs text-soft">主辦人：{e.hostName}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-brand-600">{e.count} 人參加</span>
                  </Link>
                ))}
              </div>
            )
          )}
          {tab === "credit" && (
            data.topCredit.length === 0 ? <EmptyState icon="⭐" title="尚無資料" /> : (
              <div className="flex flex-col gap-2">
                {data.topCredit.map((u: any, i: number) => (
                  <Link key={u.id} href={`/profile/${u.id}`} className="card-surface flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                    <span className="w-8 text-center text-lg font-bold text-main">{["🥇", "🥈", "🥉"][i] || i + 1}</span>
                    <img src={u.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${u.id}`} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <p className="min-w-0 flex-1 truncate font-semibold text-main">{u.name}</p>
                    <CreditBadge score={u.creditScore} />
                  </Link>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
