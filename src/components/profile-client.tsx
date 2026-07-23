"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CreditBadge, BlacklistBadge, EmptyState, Badge } from "@/components/ui";
import { formatDate, eventStatusLabel } from "@/lib/utils";
import { Calendar, Users, Star, AlertTriangle, ShieldAlert } from "lucide-react";
import { BLACKLIST_REASONS } from "@/lib/constants";

export function ProfileClient({ id }: { id: string }) {
  const [data, setData] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [showBlacklistForm, setShowBlacklistForm] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}`).then((r) => r.json()).then(setData);
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, [id]);

  if (!data) return <div className="mx-auto max-w-4xl px-4 py-16"><div className="skeleton h-64 rounded-3xl" /></div>;
  if (data.error) return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-soft">找不到這位使用者</div>;

  const { user, stats, hostedEvents } = data;
  const isSelf = me?.id === user.id;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <div className="card-surface animate-fade-up flex flex-col items-center gap-4 rounded-3xl p-8 text-center md:flex-row md:text-left">
        <img src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`} alt="" className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-100" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <h1 className="font-display text-2xl font-bold text-main">{user.name}</h1>
            <CreditBadge score={user.creditScore} />
            {user.isBlacklisted && <BlacklistBadge />}
          </div>
          <p className="mt-2 text-sm text-soft">{user.bio || "這位夥伴還沒有自我介紹"}</p>
          {user.interests?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 md:justify-start">
              {user.interests.map((tag: string) => <Badge key={tag}>#{tag}</Badge>)}
            </div>
          )}
          {user.isBlacklisted && user.blacklistReason && (
            <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 md:justify-start">
              <AlertTriangle size={14} /> 黑名單原因：{user.blacklistReason}
            </p>
          )}
        </div>
        {isSelf && (
          <Link href="/settings" className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-bold text-main">編輯個人資料</Link>
        )}
        {!isSelf && me && (
          <button onClick={() => setShowBlacklistForm(true)} className="flex items-center gap-1.5 rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-500">
            <ShieldAlert size={14} /> 申請黑名單
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Calendar size={16} />} label="主辦活動" value={stats.hostedCount} />
        <StatCard icon={<Users size={16} />} label="參加活動" value={stats.attendedCount} />
        <StatCard icon={<Star size={16} />} label="平均評價" value={stats.avgOverall ? stats.avgOverall.toFixed(1) : "-"} />
      </div>

      <div>
        <h3 className="mb-3 font-display font-bold text-main">主辦過的活動</h3>
        {hostedEvents.length === 0 ? <EmptyState icon="🎪" title="還沒有主辦過活動" /> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hostedEvents.map((e: any) => (
              <Link key={e.id} href={`/events/${e.id}`} className="card-surface flex gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                <img src={e.coverImageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-main">{e.title}</p>
                  <p className="text-xs text-soft">{formatDate(e.eventDate)} · {eventStatusLabel(e.status)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showBlacklistForm && <BlacklistForm targetUserId={user.id} targetName={user.name} onClose={() => setShowBlacklistForm(false)} />}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card-surface flex flex-col items-center gap-1 rounded-2xl p-4 text-center">
      <div className="text-brand-600">{icon}</div>
      <p className="text-xl font-bold text-main">{value}</p>
      <p className="text-xs text-soft">{label}</p>
    </div>
  );
}

function BlacklistForm({ targetUserId, targetName, onClose }: { targetUserId: number; targetName: string; onClose: () => void }) {
  const [reason, setReason] = useState(BLACKLIST_REASONS[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eligibleEvents, setEligibleEvents] = useState<{ id: number; title: string; eventDate: string }[]>([]);
  const [eventId, setEventId] = useState<number | "">("");

  useEffect(() => {
    fetch("/api/host/events-with-participants")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => {
        const matches = (d.events || []).filter((e: any) => e.participants.some((p: any) => p.userId === targetUserId));
        setEligibleEvents(matches);
        if (matches.length === 1) setEventId(matches[0].id);
      })
      .finally(() => setLoadingEvents(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blacklist-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, eventId, reason, description }),
      });
      const d = await res.json();
      if (res.ok) setDone(true);
      else setError(d.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-main">申請黑名單 - {targetName}</h3>
        {done ? (
          <p className="mt-4 rounded-xl bg-brand-50 px-3 py-3 text-sm text-brand-700">
            申請已送出！管理員將會查核事情經過，若屬實將列入黑名單並通知您結果。
          </p>
        ) : loadingEvents ? (
          <p className="mt-4 text-sm text-soft">正在確認您與此使用者的活動關聯...</p>
        ) : eligibleEvents.length === 0 ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-600">
            此功能僅供活動揪主檢舉「曾報名過您所主辦活動」的使用者。您目前沒有任何活動包含 {targetName} 的報名紀錄，無法提出申請。
          </p>
        ) : (
          <>
            <p className="mt-2 text-xs text-soft">此功能僅供活動揪主檢舉曾參與您活動的使用者。請如實填寫，管理員將會查核。</p>
            {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-soft">相關活動</span>
              <select value={eventId} onChange={(e) => setEventId(Number(e.target.value))} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none">
                <option value="" disabled>請選擇活動</option>
                {eligibleEvents.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}（{e.eventDate}）</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-soft">原因</span>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none">
                {BLACKLIST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-xs font-semibold text-soft">詳細事情經過（至少 10 字）</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none" placeholder="請詳述時間、地點、發生經過..." />
            </label>
          </>
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">{done ? "關閉" : "取消"}</button>
          {!done && eligibleEvents.length > 0 && (
            <button disabled={loading || description.length < 10 || !eventId} onClick={submit} className="btn-coral flex-1 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">送出申請</button>
          )}
        </div>
      </div>
    </div>
  );
}
