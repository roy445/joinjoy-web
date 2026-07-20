"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SectionTitle, EmptyState, Skeleton } from "@/components/ui";
import { EventCard, type EventCardData } from "@/components/event-card";
import { REGIONS, EVENT_TAGS } from "@/lib/constants";
import { Search, SlidersHorizontal, X } from "lucide-react";

function ExploreContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    q: sp.get("q") || "",
    region: sp.get("region") || "",
    date: sp.get("date") || "",
    tag: sp.get("tag") || "all",
    minCapacity: sp.get("minCapacity") || "",
    freeOnly: sp.get("freeOnly") === "1",
    sort: sp.get("sort") || "latest",
  });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.region) params.set("region", filters.region);
    if (filters.date) params.set("date", filters.date);
    if (filters.tag && filters.tag !== "all") params.set("tag", filters.tag);
    if (filters.minCapacity) params.set("minCapacity", filters.minCapacity);
    if (filters.freeOnly) params.set("freeOnly", "1");
    params.set("sort", filters.sort);
    params.set("limit", "24");

    fetch(`/api/events?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFilterCount = [filters.region, filters.date, filters.tag !== "all" ? filters.tag : "", filters.minCapacity, filters.freeOnly ? "1" : ""].filter(Boolean).length;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="EXPLORE" title="探索活動" />

      <div className="card-surface flex flex-col gap-3 rounded-2xl p-3 md:flex-row md:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-app-soft px-3 py-2.5">
          <Search size={16} className="text-soft" />
          <input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="搜尋活動名稱、主辦人、地點..."
            className="w-full bg-transparent text-sm text-main outline-none"
          />
        </div>
        <select value={filters.region} onChange={(e) => setFilters({ ...filters, region: e.target.value })} className="rounded-xl bg-app-soft px-3 py-2.5 text-sm text-main outline-none">
          <option value="">地區不限</option>
          {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className="rounded-xl bg-app-soft px-3 py-2.5 text-sm text-main outline-none" />
        <button onClick={() => setShowFilters((v) => !v)} className="flex items-center justify-center gap-1.5 rounded-xl bg-app-soft px-4 py-2.5 text-sm font-semibold text-main">
          <SlidersHorizontal size={16} /> 更多篩選 {activeFilterCount > 0 && <span className="rounded-full bg-coral-500 px-1.5 text-[10px] text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {showFilters && (
        <div className="card-surface animate-fade-up flex flex-col gap-4 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-soft">最低名額</span>
            {[0, 5, 10, 20].map((n) => (
              <button key={n} onClick={() => setFilters({ ...filters, minCapacity: n ? String(n) : "" })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.minCapacity === String(n) || (!filters.minCapacity && n === 0) ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>
                {n === 0 ? "不限" : `${n}+`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-soft">費用</span>
            <button onClick={() => setFilters({ ...filters, freeOnly: !filters.freeOnly })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.freeOnly ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>
              只看免費
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-soft">排序</span>
            {[
              { key: "latest", label: "最新發布" },
              { key: "popular", label: "最多人參加" },
              { key: "upcoming", label: "即將開始" },
            ].map((s) => (
              <button key={s.key} onClick={() => setFilters({ ...filters, sort: s.key })} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filters.sort === s.key ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFilters({ q: filters.q, region: "", date: "", tag: "all", minCapacity: "", freeOnly: false, sort: "latest" })}
            className="flex w-fit items-center gap-1 text-xs font-semibold text-coral-500"
          >
            <X size={14} /> 清除篩選
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        <button onClick={() => setFilters({ ...filters, tag: "all" })} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${filters.tag === "all" ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>全部標籤</button>
        {EVENT_TAGS.map((tag) => (
          <button key={tag} onClick={() => setFilters({ ...filters, tag })} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${filters.tag === tag ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>
            #{tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      ) : events.length === 0 ? (
        <EmptyState icon="🔍" title="找不到符合條件的活動" subtitle="試試調整篩選條件，或建立你自己的活動！" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
