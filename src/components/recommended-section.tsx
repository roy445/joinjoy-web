"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { EventCard, type EventCardData } from "@/components/event-card";

export function RecommendedSection() {
  const [items, setItems] = useState<EventCardData[]>([]);
  const [reason, setReason] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/recommendations")
      .then((r) => r.json())
      .then((data) => {
        setItems((data.events || []).map((e: any) => ({ ...e, fee: e.fee ?? "0", participantCount: e.participantCount ?? 0 })));
        setReason(data.reason || "");
      })
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && items.length === 0) return null;

  return (
    <section className="animate-fade-up">
      <SectionTitle eyebrow="AI SMART PICK" title="✨ 為你推薦" action={<span className="text-xs text-soft">{reason}</span>} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </section>
  );
}
