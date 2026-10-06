"use client";

import { FormEvent, useMemo, useState } from "react";
import { CloudRain, Droplets, ExternalLink, MapPin, Search, Thermometer, Wind } from "lucide-react";

type WeatherPeriod = {
  label: string;
  summary: string;
  temperature: number;
  minTemperature: number | null;
  maxTemperature: number | null;
  precipitationProbability: number;
  windSpeed: number | null;
  startTime: string;
  endTime: string;
};
type WeatherResult = {
  location: { name: string; admin1?: string | null };
  summary: string;
  minTemperature: number;
  maxTemperature: number;
  precipitationProbability: number;
  precipitationMm: number | null;
  windSpeed: number;
  recommendation: string;
  rainy: boolean;
  periods: WeatherPeriod[];
  selectedPeriodIndex?: number;
  source: string;
  sourceUrl: string;
  sourceDataset: string;
  fetchedAt: string;
};

function periodLabel(period: WeatherPeriod) {
  const start = new Date(period.startTime.replace(" ", "T"));
  const end = new Date(period.endTime.replace(" ", "T"));
  const date = Number.isNaN(start.getTime()) ? period.startTime.slice(0, 10) : start.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
  const startTime = Number.isNaN(start.getTime()) ? period.label : start.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = Number.isNaN(end.getTime()) ? "" : end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${startTime}${endTime ? `–${endTime}` : ""}`;
}

export default function WeatherPage() {
  const [city, setCity] = useState("台北市");
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedPeriod = useMemo(() => result?.periods[selectedPeriodIndex] ?? result?.periods[0], [result, selectedPeriodIndex]);

  async function searchWeather(event: FormEvent) {
    event.preventDefault();
    if (!city.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/planner/weather?city=${encodeURIComponent(city.trim())}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法取得天氣");
      setResult(data);
      setSelectedPeriodIndex(Math.min(data.selectedPeriodIndex ?? 0, Math.max((data.periods?.length ?? 1) - 1, 0)));
    } catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : "目前無法取得天氣，請稍後再試"); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto max-w-4xl px-4 py-10 md:px-8">
    <div className="mb-8"><p className="text-xs font-black tracking-[0.24em] text-brand-600">CITY WEATHER</p><h1 className="mt-2 font-display text-3xl font-black text-main">查詢縣市天氣</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-soft">輸入台灣縣市名稱，再選擇今明兩天的預報時段。最多提供未來 36 小時（不超過 2 天）的官方預報。</p></div>
    <form onSubmit={searchWeather} className="card-surface flex flex-col gap-3 rounded-3xl p-4 sm:flex-row"><label className="sr-only" htmlFor="weather-city">縣市名稱</label><div className="relative flex-1"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500" size={18} /><input id="weather-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="例如：台中市、高雄市、花蓮" className="w-full rounded-2xl border border-[var(--color-border)] bg-app px-10 py-3 text-sm text-main outline-none focus:border-brand-500" /></div><button type="submit" disabled={loading || !city.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-black text-white transition hover:bg-brand-600 disabled:opacity-50"><Search size={17} />{loading ? "查詢中…" : "查詢天氣"}</button></form>
    {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
    {result && selectedPeriod && <section className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#173e55] via-[#1d6272] to-[#79c8bd] p-6 text-white shadow-xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-white/75"><MapPin size={16} />{result.location.name}</p><h2 className="mt-3 font-display text-4xl font-black">{selectedPeriod.summary}</h2><p className="mt-2 text-sm text-white/75">{periodLabel(selectedPeriod)}</p></div><CloudRain className="text-white/80" size={58} strokeWidth={1.4} /></div>
      <div className="mt-6 rounded-2xl bg-white/10 p-4"><label htmlFor="weather-period" className="block text-xs font-black tracking-wider text-white/70">選擇預報日期與時間（最多今明兩天）</label><select id="weather-period" value={selectedPeriodIndex} onChange={(event) => setSelectedPeriodIndex(Number(event.target.value))} className="mt-2 w-full rounded-xl border-0 bg-white/15 px-3 py-3 text-sm font-bold text-white outline-none">{result.periods.slice(0, 3).map((period, index) => <option className="text-main" key={`${period.startTime}-${index}`} value={index}>{periodLabel(period)}｜{period.summary}</option>)}</select></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-4"><Thermometer size={18} /><p className="mt-3 text-xs text-white/70">時段溫度</p><p className="mt-1 font-black">{selectedPeriod.minTemperature ?? selectedPeriod.temperature}–{selectedPeriod.maxTemperature ?? selectedPeriod.temperature}°C</p></div><div className="rounded-2xl bg-white/10 p-4"><Droplets size={18} /><p className="mt-3 text-xs text-white/70">降雨機率</p><p className="mt-1 font-black">{selectedPeriod.precipitationProbability}%</p></div><div className="rounded-2xl bg-white/10 p-4"><CloudRain size={18} /><p className="mt-3 text-xs text-white/70">預估雨量</p><p className="mt-1 font-black">—</p></div><div className="rounded-2xl bg-white/10 p-4"><Wind size={18} /><p className="mt-3 text-xs text-white/70">風速</p><p className="mt-1 font-black">{selectedPeriod.windSpeed ?? "—"} km/h</p></div></div>
      <p className="mt-6 rounded-2xl bg-white/15 p-4 text-sm font-bold leading-6">{selectedPeriod.precipitationProbability >= 40 ? "雨備提醒：" : "出遊建議："}{result.recommendation}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/75"><span>資料來源：{result.source}｜{result.sourceDataset}</span><span>·</span><a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-white underline">查看官方資料集 <ExternalLink size={13} /></a></div>
    </section>}
  </main>;
}
