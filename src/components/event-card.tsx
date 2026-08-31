"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Users, Calendar, Clock } from "lucide-react";
import { formatDate, eventStatusLabel } from "@/lib/utils";
import { UserHonor } from "@/components/user-honor";
import { AvatarDecoration } from "@/components/avatar-decoration";

export type EventCardData = {
  id: number;
  title: string;
  coverImageUrl: string | null;
  eventDate: string;
  startTime?: string;
  meetingLocation?: string;
  region?: string | null;
  capacity: number;
  fee: string;
  status: string;
  hostName?: string | null;
  hostAvatar?: string | null;
  tags?: string[] | null;
  participantCount: number;
  remaining?: number;
  hostRole?: string | null;
  hostTitle?: string | null;
  hostBadge?: string | null;
  hostAvatarFrame?: string | null;
};

const statusStyle: Record<string, string> = {
  upcoming: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  ongoing: "bg-coral-500/10 text-coral-600",
  completed: "bg-gray-500/10 text-gray-500",
  cancelled: "bg-rose-500/10 text-rose-500",
};

function getCountdown(eventDate: string, startTime?: string) {
  const target = new Date(`${eventDate}T${startTime || "00:00"}`).getTime();
  const diff = target - Date.now();
  if (!Number.isFinite(target) || diff <= 0) return null;
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days} 天後開始`;
  if (hours > 0) return `${hours} 小時後開始`;
  return `${Math.max(1, minutes)} 分鐘後開始`;
}

export function EventCard({ event }: { event: EventCardData }) {
  const remaining = event.remaining ?? Math.max(0, event.capacity - event.participantCount);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (event.status !== "upcoming") return;
    const update = () => setCountdown(getCountdown(event.eventDate, event.startTime));
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, [event.eventDate, event.startTime, event.status]);

  const isAlmostFull = remaining > 0 && remaining <= Math.max(3, Math.ceil(event.capacity * 0.2));
  const isFull = remaining <= 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group card-surface flex flex-col overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-44 w-full overflow-hidden bg-app-soft">
        {event.coverImageUrl ? (
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🎈</div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur ${statusStyle[event.status] || statusStyle.upcoming}`}>
          {eventStatusLabel(event.status)}
        </span>
        {event.tags && event.tags.length > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-brand-700 backdrop-blur">
            #{event.tags[0]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-base font-bold text-main">{event.title}</h3>
        <div className="flex items-center gap-1.5 text-xs text-soft">
          <AvatarDecoration src={event.hostAvatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${event.hostName}`} alt={event.hostName || "揪主"} frameName={event.hostAvatarFrame} size="sm" />
          <UserHonor
            name={event.hostName || "揪主"}
            role={event.hostRole}
            activeTitle={event.hostTitle}
            activeBadge={event.hostBadge}
            nameClassName="text-[11px]"
            isHost={true}
          />
        </div>
        <div className="mt-1 flex flex-col gap-1.5 text-xs text-soft">
          <span className="flex items-center gap-1.5">
            <Calendar size={13} /> {formatDate(event.eventDate)} {event.startTime}
          </span>
          <span className="flex items-center gap-1.5 truncate">
            <MapPin size={13} /> {event.region ? `${event.region} · ` : ""}{event.meetingLocation}
          </span>
        </div>
        {countdown && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-coral-600">
            <Clock size={13} /> {countdown}
          </span>
        )}
        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${isFull ? "text-soft" : isAlmostFull ? "text-coral-600" : "text-brand-600"}`}>
            <Users size={13} /> {isFull ? "已額滿" : `${event.participantCount} 人參加 · 剩 ${remaining} 位`}
          </span>
          <span className="text-sm font-bold text-coral-500">{Number(event.fee) > 0 ? `$${event.fee}` : "免費"}</span>
        </div>
      </div>
    </Link>
  );
}
