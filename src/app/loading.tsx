import { EventCardSkeleton } from "@/components/event-card";

export default function Loading() {
  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><div className="skeleton mb-8 h-40 rounded-[32px]" /><div className="mb-5 flex items-center justify-between"><div className="skeleton h-8 w-44 rounded-xl" /><div className="skeleton h-5 w-24 rounded-full" /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}</div></div>;
}
