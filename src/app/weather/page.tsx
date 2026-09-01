"use client";

import { FormEvent, useState } from "react";
import { CloudRain, Droplets, MapPin, Search, Thermometer, Wind } from "lucide-react";

type WeatherResult = { location: { name: string; admin1?: string | null }; summary: string; minTemperature: number; maxTemperature: number; precipitationProbability: number; precipitationMm: number; windSpeed: number; recommendation: string; rainy: boolean };

export default function WeatherPage() {
  const [city, setCity] = useState("台北市");
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchWeather(event: FormEvent) {
    event.preventDefault();
    if (!city.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/planner/weather?city=${encodeURIComponent(city.trim())}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法取得天氣");
      setResult(data);
    } catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : "目前無法取得天氣，請稍後再試"); }
    finally { setLoading(false); }
  }

  return <main className="mx-auto max-w-4xl px-4 py-10 md:px-8"><div className="mb-8"><p className="text-xs font-black tracking-[0.24em] text-brand-600">CITY WEATHER</p><h1 className="mt-2 font-display text-3xl font-black text-main">查詢縣市天氣</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-soft">輸入台灣縣市名稱，就能查看今天的天氣、溫度、降雨機率與出遊建議。資料會自動以台灣時區更新。</p></div><form onSubmit={searchWeather} className="card-surface flex flex-col gap-3 rounded-3xl p-4 sm:flex-row"><label className="sr-only" htmlFor="weather-city">縣市名稱</label><div className="relative flex-1"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500" size={18} /><input id="weather-city" value={city} onChange={(event) => setCity(event.target.value)} placeholder="例如：台中市、高雄市、花蓮" className="w-full rounded-2xl border border-[var(--color-border)] bg-app px-10 py-3 text-sm text-main outline-none focus:border-brand-500" /></div><button type="submit" disabled={loading || !city.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-black text-white transition hover:bg-brand-600 disabled:opacity-50"><Search size={17} />{loading ? "查詢中…" : "查詢天氣"}</button></form>{error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}{result && <section className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#173e55] via-[#1d6272] to-[#79c8bd] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-white/75"><MapPin size={16} />{result.location.name}{result.location.admin1 ? ` · ${result.location.admin1}` : ""}</p><h2 className="mt-3 font-display text-4xl font-black">{result.summary}</h2><p className="mt-2 text-sm text-white/75">今日預報</p></div><CloudRain className="text-white/80" size={58} strokeWidth={1.4} /></div><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white/10 p-4"><Thermometer size={18} /><p className="mt-3 text-xs text-white/70">溫度範圍</p><p className="mt-1 font-black">{result.minTemperature}–{result.maxTemperature}°C</p></div><div className="rounded-2xl bg-white/10 p-4"><Droplets size={18} /><p className="mt-3 text-xs text-white/70">降雨機率</p><p className="mt-1 font-black">{result.precipitationProbability}%</p></div><div className="rounded-2xl bg-white/10 p-4"><CloudRain size={18} /><p className="mt-3 text-xs text-white/70">預估雨量</p><p className="mt-1 font-black">{result.precipitationMm} mm</p></div><div className="rounded-2xl bg-white/10 p-4"><Wind size={18} /><p className="mt-3 text-xs text-white/70">最大風速</p><p className="mt-1 font-black">{result.windSpeed} km/h</p></div></div><p className="mt-6 rounded-2xl bg-white/15 p-4 text-sm font-bold leading-6">{result.rainy ? "雨備提醒：" : "出遊建議："}{result.recommendation}</p></section>}</main>;
}
