"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SectionTitle, EmptyState, Skeleton, Badge } from "@/components/ui";
import { Search, PlusCircle, Users, Lock, Globe, KeyRound, Loader2 } from "lucide-react";

type Group = {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string | null;
  isPrivate: boolean;
  ownerName: string | null;
  memberCount: number;
  myStatus: string | null;
};

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [q, setQ] = useState("");
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState("");

  function load(query?: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    fetch(`/api/groups?${params.toString()}`).then((r) => r.json()).then((d) => setGroups(d.groups || []));
  }

  useEffect(() => { load(); }, []);

  async function joinByCode() {
    if (!code.trim()) return;
    setJoining(true);
    setJoinMessage("");
    try {
      const res = await fetch("/api/groups/join-by-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok) {
        router.push(`/groups/${d.groupId}`);
      } else {
        setJoinMessage(d.error);
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle
        eyebrow="COMMUNITIES"
        title="👥 揪團社"
        action={
          <Link href="/groups/create" className="btn-coral flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold">
            <PlusCircle size={16} /> 建立社團
          </Link>
        }
      />
      <p className="-mt-4 text-sm text-soft">找到志同道合的私人社團，加入後就能看到只在社團內發佈的專屬活動。</p>

      {/* Join by invite code */}
      <div className="card-surface flex flex-col gap-3 rounded-2xl border-2 border-dashed border-brand-300/60 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="font-display font-bold text-main">有邀請代碼嗎？</p>
            <p className="text-xs text-soft">輸入朋友給你的社團邀請代碼，立即加入</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinByCode()}
              placeholder="例如：GRP-XXXXXXXX"
              className="w-48 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm uppercase tracking-wider text-main outline-none"
            />
            <button disabled={joining || !code.trim()} onClick={joinByCode} className="btn-coral flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              {joining && <Loader2 size={14} className="animate-spin" />} 加入
            </button>
          </div>
          {joinMessage && <p className="text-xs text-rose-500">{joinMessage}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl bg-app-soft px-3 py-2.5">
        <Search size={16} className="text-soft" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          placeholder="搜尋社團名稱..."
          className="w-full bg-transparent text-sm text-main outline-none"
        />
        <button onClick={() => load(q)} className="btn-brand rounded-full px-4 py-1.5 text-xs font-bold">搜尋</button>
      </div>

      {groups === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState icon="👥" title="目前還沒有任何社團" subtitle="成為第一個建立社團的人吧！" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card-surface flex flex-col overflow-hidden rounded-3xl transition hover:-translate-y-1 hover:shadow-lg">
              <div className="relative h-32 w-full bg-app-soft">
                {g.coverImageUrl ? (
                  <img src={g.coverImageUrl} alt={g.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">👥</div>
                )}
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-main backdrop-blur">
                  {g.isPrivate ? <><Lock size={11} /> 私人</> : <><Globe size={11} /> 公開</>}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="line-clamp-1 font-display text-base font-bold text-main">{g.name}</h3>
                <p className="line-clamp-2 text-xs text-soft">{g.description}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                    <Users size={13} /> {g.memberCount} 位成員
                  </span>
                  {g.myStatus === "approved" && <Badge tone="brand">已加入</Badge>}
                  {g.myStatus === "pending" && <Badge tone="coral">審核中</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}