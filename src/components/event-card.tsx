"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Users, Calendar } from "lucide-react";
import { formatDate, eventStatusLabel } from "@/lib/utils";

export type EventCardData = {
  id: number; title: string; coverImageUrl: string | null; eventDate: string; startTime?: string;
  meetingLocation?: string; region?: string | null; capacity: number; fee: string; status: string;
  hostName?: string | null; hostAvatar?: string | null; tags?: string[] | null; participantCount: number; remaining?: number;
};

const statusStyle: Record<string, string> = { upcoming: "bg-brand-500/10 text-brand-700 dark:text-brand-300", ongoing: "bg-coral-500/10 text-coral-600", completed: "bg-gray-500/10 text-gray-500", cancelled: "bg-rose-500/10 text-rose-500" };
const cardVariants = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.23, 1, 0.32, 1] as const } } };

export function EventCard({ event, index = 0 }: { event: EventCardData; index?: number }) {
  const remaining = event.remaining ?? Math.max(0, event.capacity - event.participantCount);
  return <motion.div initial="hidden" animate="show" variants={cardVariants} whileHover={{ y: -5 }} transition={{ duration: 0.2, delay: index * 0.06 }}>
<Link href={`/events/${event.id}`} className="group card-surface flex h-full flex-col overflow-hidden rounded-3xl transition-shadow duration-300 hover:shadow-xl"><div className="relative h-44 w-full overflow-hidden bg-app-soft">{event.coverImageUrl ? <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /> : <div className="flex h-full w-full items-center justify-center text-4xl">🎈</div>}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur ${statusStyle[event.status] || statusStyle.upcoming}`}>{eventStatusLabel(event.status)}</span>{event.tags && event.tags.length > 0 && <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-brand-700 backdrop-blur">#{event.tags[0]}</span>}</div><div className="flex flex-1 flex-col gap-2 p-4"><h3 className="line-clamp-2 font-display text-base font-bold text-main">{event.title}</h3><div className="flex items-center gap-1.5 text-xs text-soft"><img src={event.hostAvatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${event.hostName}`} alt="" className="h-5 w-5 rounded-full object-cover" /><span className="truncate">{event.hostName || "揪主"}</span></div><div className="mt-1 flex flex-col gap-1.5 text-xs text-soft"><span className="flex items-center gap-1.5"><Calendar size={13} /> {formatDate(event.eventDate)} {event.startTime}</span><span className="flex items-center gap-1.5 truncate"><MapPin size={13} /> {event.region ? `${event.region} · ` : ""}{event.meetingLocation}</span></div><div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2.5"><span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600"><Users size={13} /> {event.participantCount} 人參加 · 剩 {remaining} 位</span><span className="text-sm font-bold text-coral-500">{Number(event.fee) > 0 ? `$${event.fee}` : "免費"}</span></div></div></Link></motion.div>;
}

export function EventCardSkeleton() { return <div className="card-surface overflow-hidden rounded-3xl"><div className="skeleton h-44" /><div className="space-y-3 p-4"><div className="skeleton h-5 w-4/5 rounded-lg" /><div className="skeleton h-4 w-2/5 rounded-lg" /><div className="skeleton h-4 w-full rounded-lg" /><div className="skeleton h-4 w-3/4 rounded-lg" /><div className="skeleton mt-4 h-8 w-full rounded-xl" /></div></div>; }
