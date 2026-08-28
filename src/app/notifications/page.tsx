"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { CheckCheck } from "lucide-react";

const ICONS: Record<string, string> = {
  event_join: "🙋", event_leave: "👋", event_cancelled: "🚫", event_time_changed: "⏰",
  event_comment: "💬", chat_mention: "🔔", event_poll: "📊", event_announcement: "📣",
  waitlist_promoted: "🎉", participant_status: "✅", event_reminder: "⏳", site_announcement: "📢",
  account_suspended: "⛔", account_restored: "🔓", blacklist_added: "⚠️", blacklist_removed: "🔓",
  create_request_approved: "🎊", create_request_rejected: "😢", admin_create_request: "🛠️",
  admin_report: "🚩", admin_blacklist_request: "🛡️", credit_granted: "🎁", report_update: "📮",
  event_deleted: "🗑️", event_deleted_admin: "🗑️", admin_appeal: "🙋", appeal_approved: "🎉", appeal_rejected: "📮",
};

export default function NotificationsPage() {
  const [list, setList] = useState<any[] | null>(null);

  function load() {
    fetch("/api/notifications").then((r) => (r.ok ? r.json() : { notifications: [] })).then((d) => setList(d.notifications || []));
  }
  useEffect(() => { load(); }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    load();
  }

  async function markRead(id: number) {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="NOTIFICATIONS" title="通知中心" action={<button onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-semibold text-brand-600"><CheckCheck size={16} /> 全部已讀</button>} />
      {list === null ? null : list.length === 0 ? (
        <EmptyState icon="🔔" title="目前沒有通知" />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((n: any) => (
            <Link key={n.id} href={n.link || "#"} onClick={() => !n.isRead && markRead(n.id)} className={`card-surface flex items-start gap-3 rounded-2xl p-4 transition ${!n.isRead ? "border-l-4 border-l-brand-500" : "opacity-70"}`}>
              <span className="text-2xl">{ICONS[n.type] || "🔔"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-main">{n.title}</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-soft">{n.content}</p>
                <p className="mt-1 text-xs text-soft">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-coral-500" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
