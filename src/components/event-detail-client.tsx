"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  MapPin, Users, Calendar, Clock, Share2, Heart, Flag, MessageCircle,
  Send, ImagePlus, Megaphone, BarChart3, ShieldAlert, Loader2, Check, X, Copy,
  ArrowUpRight, Sparkles,
} from "lucide-react";
import { formatDate, eventStatusLabel, genderLimitLabel, timeAgo } from "@/lib/utils";
import { Badge, CreditBadge, BlacklistBadge, EmptyState } from "@/components/ui";
import { REPORT_REASONS } from "@/lib/constants";
import { ShareModal } from "@/components/share-modal";

type Tab = "info" | "participants" | "map" | "comments" | "chat" | "announcements";

function useEventData(id: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    fetch(`/api/events/${id}`).then((r) => r.json()).then((d) => { setData(d); setLoading(false); });
  }, [id]);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

export function EventDetailClient({ id }: { id: string }) {
  const { data, loading, reload } = useEventData(id);
  const [tab, setTab] = useState<Tab>("info");
  const [me, setMe] = useState<any>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user));
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-10"><div className="skeleton h-96 rounded-3xl" /></div>;
  }
  if (!data || data.error) {
    return <div className="mx-auto max-w-5xl px-4 py-20 text-center text-soft">找不到這個活動，它可能已被刪除。</div>;
  }

  const { event, host, participants, waitlist, pending, remaining, myParticipation, isFavorited, isOwner, isAdmin } = data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      {toast && (
        <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2 animate-fade-up rounded-full bg-main px-4 py-2 text-sm font-semibold text-white shadow-xl" style={{ background: "var(--color-brand-600)" }}>
          {toast}
        </div>
      )}

      {/* Cover */}
      <div className="relative h-64 w-full overflow-hidden rounded-3xl md:h-96">
        <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge tone={event.status === "cancelled" ? "rose" : "brand"}>{eventStatusLabel(event.status)}</Badge>
          {event.isPrivate && <Badge tone="gray">🔒 私人活動</Badge>}
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {event.tags?.length > 0 && <span className="chip">#{event.tags[0]}</span>}
            <h1 className="mt-2 font-display text-2xl font-extrabold text-white drop-shadow md:text-3xl">{event.title}</h1>
          </div>
          <ActionButtons event={event} isFavorited={isFavorited} showToast={showToast} reload={reload} />
        </div>
      </div>

      {/* Host + quick info */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link href={`/profile/${host.id}`} className="card-surface flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
          <img src={host.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${host.id}`} alt="" className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-soft">揪主</p>
            <p className="truncate font-bold text-main">{host.name}</p>
            <div className="mt-0.5"><CreditBadge score={host.creditScore} /></div>
          </div>
        </Link>
        <InfoTile icon={<Calendar size={16} />} label="日期時間" value={`${formatDate(event.eventDate)} ${event.startTime}${event.endTime ? ` - ${event.endTime}` : ""}`} />
        <InfoTile icon={<Users size={16} />} label="名額" value={`${participants.length}/${event.capacity} 人（剩 ${remaining} 位）`} />
      </div>

      <JoinPanel event={event} me={me} myParticipation={myParticipation} remaining={remaining} showToast={showToast} reload={reload} />

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto hide-scrollbar border-b border-[var(--color-border)]">
        {[
          { key: "info", label: "介紹" },
          { key: "participants", label: `報名名單 (${participants.length})` },
          { key: "map", label: "地圖位置" },
          { key: "comments", label: "留言區" },
          { key: "chat", label: "聊天室" },
          { key: "announcements", label: "公告" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`shrink-0 px-4 py-3 text-sm font-semibold transition ${tab === t.key ? "border-b-2 border-brand-500 text-brand-600" : "text-soft"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="py-6">
        {tab === "info" && <InfoTab event={event} isOwner={isOwner} isAdmin={isAdmin} showToast={showToast} reload={reload} />}
        {tab === "participants" && (
          <ParticipantsTab
            event={event}
            participants={participants}
            waitlist={waitlist}
            pending={pending}
            isOwner={isOwner || isAdmin}
            me={me}
            showToast={showToast}
            reload={reload}
          />
        )}
        {tab === "map" && <MapTab event={event} />}
        {tab === "comments" && <CommentsTab eventId={event.id} me={me} />}
        {tab === "chat" && <ChatTab eventId={event.id} me={me} isMember={isOwner || myParticipation?.status === "approved"} host={host} />}
        {tab === "announcements" && <AnnouncementsTab eventId={event.id} isOwner={isOwner || isAdmin} showToast={showToast} />}
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-soft">{label}</p>
        <p className="truncate text-sm font-bold text-main">{value}</p>
      </div>
    </div>
  );
}

function ActionButtons({ event, isFavorited, showToast, reload }: any) {
  const [fav, setFav] = useState(isFavorited);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);

  async function toggleFavorite() {
    const res = await fetch(`/api/events/${event.id}/favorite`, { method: "POST" });
    const d = await res.json();
    if (res.ok) { setFav(d.favorited); showToast(d.favorited ? "已加入收藏" : "已取消收藏"); }
    else showToast(d.error);
  }

  return (
    <div className="flex gap-2">
      <button onClick={toggleFavorite} className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition ${fav ? "bg-coral-500 text-white" : "bg-white/80 text-coral-500"}`}>
        <Heart size={18} fill={fav ? "white" : "none"} />
      </button>
      <button onClick={() => setShowShare(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-main backdrop-blur">
        <Share2 size={18} />
      </button>
      <button onClick={() => setShowReport(true)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-rose-500 backdrop-blur">
        <Flag size={18} />
      </button>
      {showReport && <ReportModal eventId={event.id} onClose={() => setShowReport(false)} showToast={showToast} />}
      {showShare && <ShareModal title={event.title} onClose={() => setShowShare(false)} />}
    </div>
  );
}

function ReportModal({ eventId, onClose, showToast, targetId, type = "event" }: any) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description, targetId, type }),
      });
      const d = await res.json();
      if (res.ok) { showToast("檢舉已送出，管理員將盡快處理"); onClose(); }
      else showToast(d.error);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-main">檢舉內容</h3>
          <button onClick={onClose}><X size={18} className="text-soft" /></button>
        </div>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">檢舉原因</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none">
            {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">詳細說明</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" placeholder="請描述發生的狀況" />
        </label>
        <button disabled={loading} onClick={submit} className="btn-coral flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold">
          {loading && <Loader2 size={16} className="animate-spin" />} 送出檢舉
        </button>
      </div>
    </div>
  );
}

function JoinPanel({ event, me, myParticipation, remaining, showToast, reload }: any) {
  const [showModal, setShowModal] = useState(false);

  if (!me) {
    return (
      <div className="card-surface mt-4 flex items-center justify-between rounded-2xl p-4">
        <p className="text-sm text-soft">登入後即可報名這場活動</p>
        <Link href="/login" className="btn-brand rounded-full px-5 py-2 text-sm font-bold">前往登入</Link>
      </div>
    );
  }

  if (event.hostId === me.id) {
    return (
      <div className="card-surface mt-4 flex items-center justify-between rounded-2xl p-4">
        <p className="text-sm text-soft">你是這場活動的揪主，可以在「報名名單」分頁管理成員</p>
        <Link href={`/events/${event.id}/edit`} className="rounded-full border border-[var(--color-border)] px-5 py-2 text-sm font-bold text-main">編輯活動</Link>
      </div>
    );
  }

  async function leave() {
    if (!confirm("確定要退出這個活動嗎？")) return;
    const res = await fetch(`/api/events/${event.id}/join`, { method: "DELETE" });
    const d = await res.json();
    if (res.ok) { showToast("已退出活動"); reload(); } else showToast(d.error);
  }

  if (myParticipation && ["approved", "pending", "waitlist"].includes(myParticipation.status)) {
    const statusLabel: Record<string, string> = { approved: "✅ 已確定報名", pending: "⏳ 審核中", waitlist: "🕐 候補中" };
    return (
      <div className="card-surface sticky bottom-3 z-30 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-xl md:static md:shadow-none">
        <p className="text-sm font-bold text-brand-600">{statusLabel[myParticipation.status]}</p>
        <button onClick={leave} className="rounded-full border border-rose-300 px-5 py-2 text-sm font-bold text-rose-500">退出活動</button>
      </div>
    );
  }

  if (event.status === "cancelled" || event.status === "completed") return null;

  return (
    <div className="card-surface sticky bottom-3 z-30 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-xl md:static md:shadow-none">
      <div>
        <p className="text-sm font-bold text-main">{remaining > 0 ? `剩餘 ${remaining} 個名額` : event.allowWaitlist ? "名額已滿，可加入候補" : "名額已滿"}</p>
        <p className="text-xs text-soft">費用：{Number(event.fee) > 0 ? `$${event.fee}` : "免費"} · {genderLimitLabel(event.genderLimit)}</p>
      </div>
      <button onClick={() => setShowModal(true)} className="btn-coral rounded-full px-6 py-2.5 text-sm font-bold">立即報名</button>
      {showModal && <JoinModal event={event} onClose={() => setShowModal(false)} showToast={showToast} reload={reload} />}
    </div>
  );
}

function JoinModal({ event, onClose, showToast, reload }: any) {
  const [agree, setAgree] = useState(false);
  const [plusOne, setPlusOne] = useState(0);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreePolicy: agree, plusOneCount: plusOne }),
      });
      const d = await res.json();
      if (res.ok) { showToast(d.message); onClose(); reload(); } else showToast(d.error);
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md animate-fade-up rounded-3xl p-6">
        <h3 className="font-display text-lg font-bold text-main">報名確認</h3>
        <p className="mt-1 text-sm text-soft">{event.title}</p>

        {event.allowPlusOne && (
          <label className="mt-4 block text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">攜伴人數</span>
            <select value={plusOne} onChange={(e) => setPlusOne(Number(e.target.value))} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none">
              {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} 位</option>)}
            </select>
          </label>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-coral-50 p-3 text-xs text-coral-700 dark:bg-coral-500/10">
          <ShieldAlert size={26} className="shrink-0" />
          <p>
            <b>報名須知：</b> 報名成功即代表承諾出席。若<b>無故未出席（放鳥）</b>或於活動中發生<b>騷擾、詐騙等違規行為</b>，經揪主檢舉查證屬實後，將被平台<b>列入黑名單</b>，往後參加任何活動皆會被標記，並可能被<b>永久封鎖帳號</b>。請務必三思後再報名！
          </p>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-main">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="accent-brand-500" />
          我已詳閱並同意上述報名須知
        </label>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">取消</button>
          <button disabled={!agree || loading} onClick={submit} className="btn-brand flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 確認報名
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoTab({ event, isOwner, isAdmin, showToast, reload }: any) {
  const [showCancelModal, setShowCancelModal] = useState(false);

  async function deleteEvent() {
    if (!confirm("確定要永久刪除這個活動嗎？此操作無法復原。")) return;
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (res.ok) window.location.href = "/my-events";
  }

  return (
    <div className="flex flex-col gap-6">
      {event.status === "cancelled" && event.cancelReason && (
        <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-500/10">
          <ShieldAlert className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-bold">此活動已被揪主取消</p>
            <p className="mt-1">取消原因：{event.cancelReason}</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-display font-bold text-main">活動介紹</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-soft">{event.description}</p>
      </div>

      {event.aiItinerary && (
        <div className="rounded-3xl border border-brand-500/20 bg-brand-50/30 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-main">AI 行程專區</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500">AI PLANNED ITINERARY</p>
              </div>
            </div>
            {event.isAiPlanned && (
              <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-600">
                Verified Plan
              </span>
            )}
          </div>

          <div className="relative space-y-6 border-l-2 border-brand-200/60 pl-6 ml-3">
            {event.aiItinerary.stops?.map((stop: any, i: number) => (
              <div key={i} className="relative">
                <div className="absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-2 ring-brand-500">
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-black text-brand-600">{stop.time}｜{stop.place?.name || stop.title}</h4>
                  <span className="text-[10px] font-bold text-soft">${stop.cost}</span>
                </div>
                <p className="mt-1 text-sm text-soft leading-relaxed">{stop.place?.address || stop.detail}</p>
                {stop.place?.address && (
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.place.name} ${stop.place.address}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-500 hover:underline"
                  >
                    在地圖中查看 <ArrowUpRight size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-6 rounded-2xl bg-white/60 p-3 text-[10px] text-soft leading-relaxed">
            <p>💡 <b>揪主小叮嚀：</b>此行程由 AI 輔助規劃，建議報名前先與揪主確認實際集合細節。祝你有個愉快的探索旅程！</p>
          </div>
        </div>
      )}

      {event.images && event.images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {event.images.map((img: string, i: number) => (
            <img key={i} src={img} alt="" className="h-32 w-full rounded-xl object-cover" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="集合地點" value={event.meetingLocation} />
        <DetailRow label="聯絡方式" value={event.contactInfo} />
        <DetailRow label="性別限制" value={genderLimitLabel(event.genderLimit)} />
        <DetailRow label="年齡限制" value={event.ageMin || event.ageMax ? `${event.ageMin || 0} - ${event.ageMax || "不限"} 歲` : "不限"} />
        <DetailRow label="是否需審核" value={event.requireApproval ? "需要主辦人審核" : "免審核，直接報名成功"} />
        <DetailRow label="候補機制" value={event.allowWaitlist ? "開放候補" : "不開放候補"} />
        <DetailRow label="攜伴" value={event.allowPlusOne ? "允許攜伴" : "不可攜伴"} />
        <DetailRow label="公開狀態" value={event.isPrivate ? "私人活動（不公開顯示）" : "公開活動"} />
      </div>

      {event.notes && (
        <div className="rounded-2xl bg-app-soft p-4 text-sm text-soft">
          <p className="mb-1 font-bold text-main">注意事項</p>
          {event.notes}
        </div>
      )}

      {event.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {event.tags.map((t: string) => <Badge key={t}>#{t}</Badge>)}
        </div>
      )}

      {(isOwner || isAdmin) && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
          {event.status !== "cancelled" && <button onClick={() => setShowCancelModal(true)} className="rounded-full border border-amber-300 px-4 py-2 text-xs font-bold text-amber-600">取消活動</button>}
          <button onClick={deleteEvent} className="rounded-full border border-rose-300 px-4 py-2 text-xs font-bold text-rose-500">刪除活動</button>
        </div>
      )}

      {showCancelModal && (
        <CancelEventModal
          eventId={event.id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            showToast("活動已取消，已通知所有報名者");
            reload();
          }}
        />
      )}
    </div>
  );
}

function CancelEventModal({ eventId, onClose, onCancelled }: any) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancelReason: reason }),
      });
      const d = await res.json();
      if (res.ok) onCancelled();
      else setError(d.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md animate-pop rounded-3xl p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-main">
          <ShieldAlert size={20} className="text-amber-500" /> 取消活動
        </h3>
        <p className="mt-1 text-xs text-soft">取消後將立即自動通知所有已報名的參加者，請說明取消原因。</p>
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="請說明取消原因（至少 5 個字），例如：天候不佳、人數不足、場地異動..."
          className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">先不取消</button>
          <button disabled={loading || reason.trim().length < 5} onClick={submit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 確認取消活動
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-app-soft px-3 py-2.5">
      <p className="text-[11px] text-soft">{label}</p>
      <p className="text-sm font-semibold text-main">{value}</p>
    </div>
  );
}

function ParticipantsTab({ event, participants, waitlist, pending, isOwner, me, showToast, reload }: any) {
  async function act(participantId: number, action: string) {
    const res = await fetch(`/api/events/${event.id}/participants/${participantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const d = await res.json();
    if (res.ok) reload(); else showToast(d.error);
  }

  const [reportTarget, setReportTarget] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {isOwner && pending.length > 0 && (
        <div>
          <h3 className="mb-2 font-display font-bold text-amber-600">待審核申請 ({pending.length})</h3>
          <div className="flex flex-col gap-2">
            {pending.map((p: any) => (
              <div key={p.id} className="card-surface flex items-center justify-between rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <img src={p.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${p.userId}`} className="h-9 w-9 rounded-full object-cover" alt="" />
                  <span className="text-sm font-semibold text-main">{p.name}</span>
                  {p.isBlacklisted && <BlacklistBadge />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(p.id, "approve")} className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white">通過</button>
                  <button onClick={() => act(p.id, "reject")} className="rounded-full bg-rose-500 px-3 py-1.5 text-xs font-bold text-white">拒絕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-display font-bold text-main">已確認名單 ({participants.length})</h3>
        {participants.length === 0 ? <EmptyState icon="🙋" title="還沒有人報名，快來當第一位！" /> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {participants.map((p: any) => (
              <div key={p.id} className="card-surface flex items-center justify-between rounded-xl p-3">
                <Link href={`/profile/${p.userId}`} className="flex items-center gap-2">
                  <img src={p.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${p.userId}`} className="h-9 w-9 rounded-full object-cover" alt="" />
                  <div>
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-main">{p.name} {p.plusOneCount > 0 && <span className="text-xs text-soft">+{p.plusOneCount}</span>}</span>
                    {p.isBlacklisted && <BlacklistBadge />}
                  </div>
                </Link>
                <div className="flex items-center gap-1.5">
                  {isOwner && (
                    <>
                      <button onClick={() => act(p.id, "attended")} title="標記出席" className="rounded-full bg-brand-500/10 p-1.5 text-brand-600"><Check size={14} /></button>
                      <button onClick={() => act(p.id, "absent")} title="標記未出席" className="rounded-full bg-rose-500/10 p-1.5 text-rose-500"><X size={14} /></button>
                    </>
                  )}
                  {me && event.status === "completed" && me.id !== p.userId && (
                    <RateButton eventId={event.id} rateeId={p.userId} rateeName={p.name} showToast={showToast} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {waitlist.length > 0 && (
        <div>
          <h3 className="mb-2 font-display font-bold text-main">候補名單 ({waitlist.length})</h3>
          <div className="flex flex-col gap-2">
            {waitlist.map((p: any) => (
              <div key={p.id} className="card-surface flex items-center gap-2 rounded-xl p-3">
                <img src={p.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${p.userId}`} className="h-8 w-8 rounded-full object-cover" alt="" />
                <span className="text-sm text-main">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RateButton({ eventId, rateeId, rateeName, showToast }: any) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ punctuality: 5, friendliness: 5, overall: 5, noShow: false, comment: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/ratings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rateeId, ...form }) });
      const d = await res.json();
      if (res.ok) { setDone(true); showToast("評價已送出"); } else showToast(d.error);
    } finally { setLoading(false); }
  }

  if (done) return <Badge tone="brand">已評價</Badge>;

  return (
    <>
      <button onClick={() => setShow(true)} className="rounded-full border border-brand-300 px-3 py-1.5 text-xs font-bold text-brand-600">評價</button>
      {show && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6">
            <h3 className="font-display font-bold text-main">評價 {rateeName}</h3>
            {(["punctuality", "friendliness", "overall"] as const).map((key) => (
              <div key={key} className="mt-3">
                <p className="mb-1 text-xs font-semibold text-soft">{key === "punctuality" ? "準時程度" : key === "friendliness" ? "友善程度" : "整體評價"}</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setForm({ ...form, [key]: n })} className={`text-xl ${form[key] >= n ? "text-amber-400" : "text-gray-300"}`}>★</button>
                  ))}
                </div>
              </div>
            ))}
            <label className="mt-3 flex items-center gap-2 text-sm text-main">
              <input type="checkbox" checked={form.noShow} onChange={(e) => setForm({ ...form, noShow: e.target.checked })} className="accent-rose-500" />
              此成員無故未出席（放鳥）
            </label>
            <textarea value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="留下你的評語（選填）" className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" rows={2} />
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShow(false)} className="flex-1 rounded-xl border border-[var(--color-border)] py-2 text-sm font-bold">取消</button>
              <button disabled={loading} onClick={submit} className="btn-brand flex-1 rounded-xl py-2 text-sm font-bold">送出</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MapTab({ event }: any) {
  const query = encodeURIComponent(event.mapAddress || event.meetingLocation);
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)]" style={{ height: 360 }}>
        <iframe title="map" width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://www.google.com/maps?q=${query}&output=embed`} />
      </div>
      <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer" className="btn-brand w-fit rounded-full px-5 py-2.5 text-sm font-bold">
        在 Google 地圖開啟
      </a>
    </div>
  );
}
function CommentsTab({ eventId, me }: any) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/events/${eventId}/comments`).then((r) => r.json()).then((d) => setComments(d.comments || []));
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const d = await res.json();
      if (res.ok) { setContent(""); load(); } else alert(d.error);
    } finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {me && (
        <div className="flex gap-2">
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="留下你的想法或問題..." className="flex-1 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button disabled={loading} onClick={submit} className="btn-brand rounded-xl px-4 py-2.5"><Send size={16} /></button>
        </div>
      )}
      {comments.length === 0 ? <EmptyState icon="💬" title="還沒有留言，來搶頭香吧！" /> : (
        <div className="flex flex-col gap-3">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <img src={c.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${c.userId}`} className="h-8 w-8 rounded-full object-cover" alt="" />
              <div className="rounded-2xl bg-app-soft px-3 py-2">
                <p className="text-xs font-bold text-main">{c.name} <span className="ml-1 font-normal text-soft">{timeAgo(c.createdAt)}</span></p>
                <p className="text-sm text-main">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatTab({ eventId, me, isMember, host }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [polls, setPolls] = useState<any[]>([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const loadMessages = useCallback(() => {
    fetch(`/api/events/${eventId}/chat?sinceId=0`).then((r) => r.json()).then((d) => {
      if (d.messages) { setMessages(d.messages); lastIdRef.current = d.messages.at(-1)?.id || 0; }
    });
  }, [eventId]);

  const loadPolls = useCallback(() => {
    fetch(`/api/events/${eventId}/polls`).then((r) => r.json()).then((d) => setPolls(d.polls || []));
  }, [eventId]);

  useEffect(() => {
    if (!isMember) return;
    loadMessages();
    loadPolls();
    fetch(`/api/events/${eventId}/chat/read`, { method: "POST" });
    const interval = setInterval(() => {
      fetch(`/api/events/${eventId}/chat?sinceId=${lastIdRef.current}`).then((r) => r.json()).then((d) => {
        if (d.messages?.length) {
          setMessages((prev) => [...prev, ...d.messages]);
          lastIdRef.current = d.messages.at(-1).id;
          loadPolls();
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isMember, eventId, loadMessages, loadPolls]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send() {
    if (!content.trim()) return;
    const text = content;
    setContent("");
    const res = await fetch(`/api/events/${eventId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "text", content: text }) });
    const d = await res.json();
    if (res.ok) setMessages((prev) => [...prev, d.message]);
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    const upData = await up.json();
    if (!up.ok) return alert(upData.error);
    const res = await fetch(`/api/events/${eventId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "image", imageUrl: upData.url }) });
    const d = await res.json();
    if (res.ok) setMessages((prev) => [...prev, d.message]);
  }

  if (!isMember) return <EmptyState icon="🔒" title="僅活動成員可使用聊天室" subtitle="報名並經審核通過後即可加入聊天" />;

  return (
    <div className="flex flex-col gap-3">
      {polls.map((poll: any) => (
        <PollCard key={poll.id} eventId={eventId} poll={poll} onVoted={loadPolls} />
      ))}
      {host?.id === me?.id && (
        <button onClick={() => setShowPollForm(true)} className="flex w-fit items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-bold text-main">
          <BarChart3 size={14} /> 發起投票
        </button>
      )}
      {showPollForm && <PollForm eventId={eventId} onClose={() => setShowPollForm(false)} onCreated={() => { loadPolls(); loadMessages(); }} />}

      <div className="flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl bg-app-soft p-4">
        {messages.map((m: any) => (
          <ChatBubble key={m.id} message={m} isMe={m.userId === me?.id} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-app-soft text-soft">
          <ImagePlus size={18} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
        </label>
        <input value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="輸入訊息，@提及成員..." className="flex-1 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
        <button onClick={send} className="btn-brand rounded-xl px-4 py-2.5"><Send size={16} /></button>
      </div>
    </div>
  );
}

function ChatBubble({ message, isMe }: any) {
  if (message.type === "announcement") {
    return (
      <div className="mx-auto flex max-w-[85%] items-start gap-2 rounded-xl bg-coral-500/10 px-3 py-2 text-xs text-coral-700">
        <Megaphone size={14} className="mt-0.5 shrink-0" /> <span><b>{message.name}</b>：{message.content}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
      <img src={message.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${message.userId}`} className="h-7 w-7 shrink-0 rounded-full object-cover" alt="" />
      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-brand-500 text-white" : "bg-app text-main"}`}>
        {!isMe && <p className="mb-0.5 text-[11px] font-bold opacity-70">{message.name}</p>}
        {message.type === "image" ? <img src={message.imageUrl} alt="" className="max-w-full rounded-lg" /> : <p>{message.content}</p>}
      </div>
    </div>
  );
}

function PollCard({ eventId, poll, onVoted }: any) {
  async function vote(optionIndex: number) {
    await fetch(`/api/events/${eventId}/polls/${poll.id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionIndex }) });
    onVoted();
  }
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="mb-2 flex items-center gap-1.5 font-bold text-main"><BarChart3 size={16} className="text-brand-500" /> {poll.question}</p>
      <div className="flex flex-col gap-2">
        {poll.options.map((opt: string, i: number) => {
          const pct = poll.totalVotes ? Math.round((poll.counts[i] / poll.totalVotes) * 100) : 0;
          return (
            <button key={i} onClick={() => vote(i)} className="relative overflow-hidden rounded-lg bg-app-soft px-3 py-2 text-left text-sm">
              <div className="absolute inset-y-0 left-0 bg-brand-500/15" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between">
                <span className={poll.myVote === i ? "font-bold text-brand-600" : "text-main"}>{opt} {poll.myVote === i && "✓"}</span>
                <span className="text-xs text-soft">{pct}% ({poll.counts[i]})</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PollForm({ eventId, onClose, onCreated }: any) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  async function submit() {
    const res = await fetch(`/api/events/${eventId}/polls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, options: options.filter(Boolean) }) });
    if (res.ok) { onCreated(); onClose(); } else alert((await res.json()).error);
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-sm rounded-3xl p-6">
        <h3 className="font-display font-bold text-main">發起投票</h3>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="投票問題" className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
        {options.map((o, i) => (
          <input key={i} value={o} onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`選項 ${i + 1}`} className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-sm outline-none" />
        ))}
        <button onClick={() => setOptions([...options, ""])} className="mt-2 text-xs font-bold text-brand-600">+ 新增選項</button>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2 text-sm font-bold">取消</button>
          <button onClick={submit} className="btn-brand flex-1 rounded-xl py-2 text-sm font-bold">建立投票</button>
        </div>
      </div>
    </div>
  );
}

function AnnouncementsTab({ eventId, isOwner, showToast }: any) {
  const [list, setList] = useState<any[]>([]);
  const [content, setContent] = useState("");

  const load = useCallback(() => {
    fetch(`/api/events/${eventId}/announcements`).then((r) => r.json()).then((d) => setList(d.announcements || []));
  }, [eventId]);
  useEffect(() => { load(); }, [load]);

  async function submit() {
    if (!content.trim()) return;
    const res = await fetch(`/api/events/${eventId}/announcements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    const d = await res.json();
    if (res.ok) { setContent(""); load(); showToast("公告已發布"); } else showToast(d.error);
  }

  return (
    <div className="flex flex-col gap-4">
      {isOwner && (
        <div className="flex gap-2">
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="發布重要公告給所有成員..." className="flex-1 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm outline-none" />
          <button onClick={submit} className="btn-coral rounded-xl px-4 py-2.5 text-sm font-bold">發布</button>
        </div>
      )}
      {list.length === 0 ? <EmptyState icon="📣" title="目前尚無公告" /> : (
        <div className="flex flex-col gap-2">
          {list.map((a: any) => (
            <div key={a.id} className="rounded-2xl bg-app-soft p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-coral-600"><Megaphone size={14} /> {a.name} · {timeAgo(a.createdAt)}</p>
              <p className="text-sm text-main">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}