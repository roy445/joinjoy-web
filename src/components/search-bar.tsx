"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, MapPin, Calendar, SlidersHorizontal } from "lucide-react";
import { REGIONS } from "@/lib/constants";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [date, setDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (region) params.set("region", region);
    if (date) params.set("date", date);
    router.push(`/explore?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface flex flex-col gap-2 rounded-2xl p-2 md:flex-row md:items-center md:gap-0 md:rounded-full">
      <div className="flex flex-1 items-center gap-2 px-3 py-2">
        <Search size={18} className="text-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋活動、地點、主辦人或關鍵字..." className="w-full bg-transparent text-sm text-main outline-none" />
      </div>
      <div className="hidden h-6 w-px bg-[var(--color-border)] md:block" />
      <div className="flex items-center gap-2 px-3 py-2">
        <MapPin size={16} className="text-soft" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="bg-transparent text-sm text-main outline-none">
          <option value="">地區</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <div className="hidden h-6 w-px bg-[var(--color-border)] md:block" />
      <div className="flex items-center gap-2 px-3 py-2">
        <Calendar size={16} className="text-soft" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-sm text-main outline-none" />
      </div>
      <button type="button" onClick={() => router.push("/explore")} className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-soft hover:text-brand-600 md:flex">
        <SlidersHorizontal size={16} /> 更多篩選
      </button>
      <button type="submit" className="btn-brand rounded-full px-6 py-2.5 text-sm font-bold">搜尋</button>
    </form>
  );
}
