"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState, Skeleton } from "@/components/ui";
import { EventCard } from "@/components/event-card";

export default function FavoritesPage() {
  const [events, setEvents] = useState<any[] | null>(null);

  useEffect(() => {
    fetch("/api/favorites").then((r) => (r.ok ? r.json() : { events: [] })).then((d) => setEvents(d.events || []));
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="SAVED" title="我的收藏" />
      {events === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState icon="💛" title="還沒有收藏的活動" subtitle="逛逛探索頁，收藏喜歡的活動吧！" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e: any) => <EventCard key={e.id} event={{ ...e, participantCount: Number(e.participantCount) }} />)}
        </div>
      )}
    </div>
  );
}
