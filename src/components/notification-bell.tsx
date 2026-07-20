"use client";

import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/utils";

const ICONS: Record<string, string> = {
  event_join: "🙋", event_leave: "👋", event_cancelled: "🚫", event_time_changed: "⏰",
  event_comment: "💬", chat_mention: "🔔", event_poll: "📊", event_announcement: "📣",
  waitlist_promoted: "🎉", participant_status: "✅", event_reminder: "⏳", site_announcement: "📢",
  account_suspended: "⛔", account_restored: "🔓", blacklist_added: "⚠️", blacklist_removed: "🔓",
  create_request_approved: "🎊", create_request_rejected: "😢", admin_create_request: "🛠️",
  admin_report: "🚩", admin_blacklist_request: "🛡️", credit_granted: "🎁", report_update: "📮",
  event_deleted: "🗑️", event_deleted_admin: "🗑️", admin_appeal: "🙋", appeal_approved: "🎉", appeal_rejected: "📮",
};

export function NotificationBell({ loggedIn }: { loggedIn: boolean }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/notifications?unreadCount=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) setCount(data.count ?? 0);
      } catch {
        // ignore
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [loggedIn]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && loggedIn) {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems((data.notifications || []).slice(0, 6));
      }
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markAllRead: true }) });
    setCount(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  if (!loggedIn) {
    return (
      <Link href="/login" aria-label="通知中心" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-app-soft text-main transition hover:scale-105 hover:text-brand-600">
        <Bell size={18} />
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggleOpen}
        aria-label="通知中心"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-app-soft text-main transition hover:scale-105 hover:text-brand-600"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-pulse items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="glass animate-pop absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <p className="font-display text-sm font-bold text-main">通知中心</p>
            {count > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-brand-600">
                <CheckCheck size={13} /> 全部已讀
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-soft">目前沒有通知</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "/notifications"}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 border-b border-[var(--color-border)] px-4 py-3 text-sm transition last:border-0 hover:bg-app-soft ${!n.isRead ? "bg-brand-500/5" : ""}`}
                >
                  <span className="text-lg">{ICONS[n.type] || "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-main">{n.title}</p>
                    <p className="truncate text-xs text-soft">{n.content}</p>
                    <p className="mt-0.5 text-[10px] text-soft">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-coral-500" />}
                </Link>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-[var(--color-border)] px-4 py-3 text-xs font-bold text-brand-600 hover:bg-app-soft"
          >
            查看全部通知 <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
