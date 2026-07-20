"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, EmptyState } from "@/components/ui";
import { formatDate, eventStatusLabel } from "@/lib/utils";
import { MapPin, Users, Calendar } from "lucide-react";

type MapEvent = {
  id: number;
  title: string;
  coverImageUrl: string | null;
  eventDate: string;
  startTime: string;
  meetingLocation: string;
  region: string | null;
  lat: string | null;
  lng: string | null;
  hostName: string | null;
  participantCount: number;
  capacity: number;
  fee: string;
  status: string;
};

// Rough Taiwan bounding box for placing pins on the illustrated map.
const BOUNDS = { latMin: 21.8, latMax: 25.4, lngMin: 119.9, lngMax: 122.1 };

export default function MapPage() {
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [selected, setSelected] = useState<MapEvent | null>(null);

  useEffect(() => {
    fetch("/api/events?limit=48")
      .then((r) => r.json())
      .then((d) => {
        const withCoords = (d.events || []).filter((e: MapEvent) => e.lat && e.lng);
        setEvents(withCoords);
        if (withCoords.length) setSelected(withCoords[0]);
      });
  }, []);

  function position(e: MapEvent) {
    const lat = Number(e.lat);
    const lng = Number(e.lng);
    const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * 100;
    const y = 100 - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * 100;
    return { left: `${Math.min(96, Math.max(4, x))}%`, top: `${Math.min(96, Math.max(4, y))}%` };
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="MAP MODE" title="🗺️ 地圖模式" action={<span className="text-xs text-soft">共 {events.length} 個標記活動</span>} />

      {events.length === 0 ? (
        <EmptyState icon="🗺️" title="目前尚無定位資訊的活動" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative h-[480px] overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-brand-100 via-cream-100 to-brand-50 dark:from-[#16211f] dark:via-[#131a1c] dark:to-[#17201d]">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(51,153,144,0.15), transparent 40%), radial-gradient(circle at 80% 70%, rgba(229,103,63,0.15), transparent 40%)" }} />
            {events.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelected(e)}
                style={position(e)}
                className={`absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110 ${selected?.id === e.id ? "z-10 scale-125" : ""}`}
                aria-label={e.title}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-base shadow-lg ${selected?.id === e.id ? "bg-coral-500" : "bg-brand-500"}`}>
                  <MapPin size={16} className="text-white" fill="white" />
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {selected && (
              <Link href={`/events/${selected.id}`} className="card-surface animate-fade-up flex gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                <img src={selected.coverImageUrl || undefined} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-display font-bold text-main">{selected.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-soft"><Calendar size={12} /> {formatDate(selected.eventDate)} {selected.startTime}</p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-soft"><MapPin size={12} /> {selected.meetingLocation}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600"><Users size={12} /> {selected.participantCount}/{selected.capacity} 人 · {eventStatusLabel(selected.status)}</p>
                </div>
              </Link>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto hide-scrollbar" style={{ maxHeight: 380 }}>
              {events.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelected(e)}
                  className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition ${selected?.id === e.id ? "bg-brand-500/10" : "hover:bg-app-soft"}`}
                >
                  <img src={e.coverImageUrl || undefined} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-main">{e.title}</p>
                    <p className="truncate text-xs text-soft">{e.region} · {e.meetingLocation}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
