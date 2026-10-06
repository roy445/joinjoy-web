"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CloudRain, ExternalLink, MapPin, Search, Thermometer, Wind } from "lucide-react";

type WeatherPeriod = { label: string; summary: string; temperature: number; minTemperature: number | null; maxTemperature: number | null; comfortIndex: string; precipitationProbability: number; windSpeed: number | null; startTime: string; endTime: string };
type WeatherResult = { location: { name: string; admin1?: string | null }; summary: string; minTemperature: number; maxTemperature: number; comfortIndex: string; precipitationProbability: number; windSpeed: number; recommendation: string; rainy: boolean; periods: WeatherPeriod[]; selectedPeriodIndex?: number; source: string; sourceUrl: string; sourceDataset: string; fetchedAt: string };
type AllLocation = { locationName: string; periods: WeatherPeriod[] };

const REGION_CITIES: Record<string, string[]> = {
  北部: ["基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "宜蘭縣"],
  中部: ["苗栗縣", "臺中市", "彰化縣", "南投縣", "雲林縣"],
  南部: ["嘉義市", "嘉義縣", "臺南市", "高雄市", "屏東縣"],
  東部: ["花蓮縣", "臺東縣"],
  離島: ["澎湖縣", "金門縣", "連江縣"],
};
const ALL_CITIES = Object.values(REGION_CITIES).flat();

function periodLabel(period: WeatherPeriod) {
  const start = new Date(period.startTime.replace(" ", "T"));
  const end = new Date(period.endTime.replace(" ", "T"));
  const date = Number.isNaN(start.getTime()) ? period.startTime.slice(0, 10) : start.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" });
  const startTime = Number.isNaN(start.getTime()) ? period.label : start.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = Number.isNaN(end.getTime()) ? "" : end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} ${startTime}${endTime ? `–${endTime}` : ""}`;
}

export default function WeatherPage() {
  const [region, setRegion] = useState("全部");
  const [city, setCity] = useState("臺北市");
  const [township, setTownship] = useState("");
  const [townships, setTownships] = useState<string[]>([]);
  const [townshipLoading, setTownshipLoading] = useState(false);
  const [result, setResult] = useState<WeatherResult | null>(null);
  const [allLocations, setAllLocations] = useState<AllLocation[]>([]);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allLoading, setAllLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedPeriod = useMemo(() => result?.periods[selectedPeriodIndex] ?? result?.periods[0], [result, selectedPeriodIndex]);
  const visibleCities = region === "全部" ? ALL_CITIES : REGION_CITIES[region] ?? ALL_CITIES;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/planner/weather?townships=1&city=${encodeURIComponent(city)}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, data: await response.json() }))
      .then(({ ok, data }) => { if (!cancelled) setTownships(ok ? data.locations ?? [] : []); })
      .catch(() => { if (!cancelled) setTownships([]); })
      .finally(() => { if (!cancelled) setTownshipLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  function changeRegion(value: string) {
    setRegion(value);
    const nextCity = value === "全部" ? "臺北市" : REGION_CITIES[value]?.[0] ?? "臺北市";
    setCity(nextCity);
    setTownship("");
    setTownshipLoading(true);
  }

  function changeCity(value: string) {
    setCity(value);
    setTownship("");
    setTownshipLoading(true);
  }

  async function searchWeather(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const townshipQuery = township ? `&township=${encodeURIComponent(township)}` : "";
      const response = await fetch(`/api/planner/weather?city=${encodeURIComponent(city)}${townshipQuery}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法取得天氣");
      setResult(data);
      setSelectedPeriodIndex(Math.min(data.selectedPeriodIndex ?? 0, Math.max((data.periods?.length ?? 1) - 1, 0)));
    } catch (caught) { setResult(null); setError(caught instanceof Error ? caught.message : "目前無法取得天氣，請稍後再試"); }
    finally { setLoading(false); }
  }

  async function loadAllCities() {
    setAllLoading(true); setError("");
    try {
      const response = await fetch("/api/planner/weather?all=1", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "目前無法取得全台天氣");
      setAllLocations(data.locations || []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "目前無法取得全台天氣，請稍後再試"); }
    finally { setAllLoading(false); }
  }

  const filteredLocations = allLocations.filter((location) => visibleCities.includes(location.locationName));

  return <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
    <div className="mb-8"><p className="text-xs font-black tracking-[0.24em] text-brand-600">CWA CITY WEATHER</p><h1 className="mt-2 font-display text-3xl font-black text-main">全台縣市天氣查詢</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-soft">依地區選擇縣市，查看今明 36 小時預報。下方全台資料表完整呈現中央氣象署提供的主要欄位：Wx、MaxT、MinT、CI、PoP。</p></div>
    <form onSubmit={searchWeather} className="card-surface grid gap-3 rounded-3xl p-4 md:grid-cols-[0.7fr_1fr_1.2fr_auto]"><label className="sr-only" htmlFor="weather-region">地區</label><select id="weather-region" value={region} onChange={(event) => changeRegion(event.target.value)} className="rounded-2xl border border-[var(--color-border)] bg-app px-4 py-3 text-sm font-bold text-main"><option value="全部">全部地區</option>{Object.keys(REGION_CITIES).map((item) => <option key={item} value={item}>{item}</option>)}</select><label className="sr-only" htmlFor="weather-city">縣市</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500" size={18} /><select id="weather-city" value={city} onChange={(event) => changeCity(event.target.value)} className="w-full rounded-2xl border border-[var(--color-border)] bg-app px-10 py-3 text-sm font-bold text-main">{visibleCities.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><label className="sr-only" htmlFor="weather-township">鄉鎮市區</label><select id="weather-township" value={township} onChange={(event) => setTownship(event.target.value)} disabled={townshipLoading || townships.length === 0} className="rounded-2xl border border-[var(--color-border)] bg-app px-4 py-3 text-sm font-bold text-main"><option value="">{townshipLoading ? "讀取鄉鎮市區…" : townships.length ? "整個縣市" : "沒有鄉鎮資料"}</option>{townships.map((item) => <option key={item} value={item}>{item}</option>)}</select><button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-black text-white transition hover:bg-brand-600 disabled:opacity-50"><Search size={17} />{loading ? "查詢中…" : township ? "查詢鄉鎮" : "查詢縣市"}</button></form>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-bold text-soft">地區 → 縣市 → 鄉鎮市區；鄉鎮資料來自中央氣象署 F-D0047 官方資料集。</p><button type="button" onClick={loadAllCities} disabled={allLoading} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-black text-brand-700 hover:bg-brand-50 disabled:opacity-50">{allLoading ? "讀取全台資料…" : "載入全台縣市資料"}</button></div>
    {error && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
    {result && selectedPeriod && <section className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#173e55] via-[#1d6272] to-[#79c8bd] p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-bold text-white/75"><MapPin size={16} />{result.location.name}</p><h2 className="mt-3 font-display text-4xl font-black">{selectedPeriod.summary}</h2><p className="mt-2 text-sm text-white/75">{periodLabel(selectedPeriod)}</p></div><CloudRain className="text-white/80" size={58} strokeWidth={1.4} /></div><div className="mt-6 rounded-2xl bg-white/10 p-4"><label htmlFor="weather-period" className="block text-xs font-black tracking-wider text-white/70">選擇預報日期與時間（最多今明兩天）</label><select id="weather-period" value={selectedPeriodIndex} onChange={(event) => setSelectedPeriodIndex(Number(event.target.value))} className="mt-2 w-full rounded-xl border-0 bg-white/15 px-3 py-3 text-sm font-bold text-white outline-none">{result.periods.slice(0, 3).map((period, index) => <option className="text-main" key={`${period.startTime}-${index}`} value={index}>{periodLabel(period)}｜{period.summary}</option>)}</select></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/70">Wx 天氣現象</p><p className="mt-1 font-black">{selectedPeriod.summary}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/70">MaxT 最高溫</p><p className="mt-1 font-black">{selectedPeriod.maxTemperature ?? "—"}°C</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/70">MinT 最低溫</p><p className="mt-1 font-black">{selectedPeriod.minTemperature ?? "—"}°C</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/70">CI 舒適度</p><p className="mt-1 font-black">{selectedPeriod.comfortIndex}</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/70">PoP 降雨機率</p><p className="mt-1 font-black">{selectedPeriod.precipitationProbability}%</p></div></div><p className="mt-6 rounded-2xl bg-white/15 p-4 text-sm font-bold leading-6">{selectedPeriod.precipitationProbability >= 40 ? "雨備提醒：" : "出遊建議："}{result.recommendation}</p><div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/75"><span>資料來源：{result.source}｜{result.sourceDataset}</span><span>·</span><a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-white underline">查看官方資料集 <ExternalLink size={13} /></a></div></section>}
    {filteredLocations.length > 0 && <section className="card-surface mt-8 overflow-hidden rounded-[2rem] p-5 sm:p-8"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-black text-main">{region === "全部" ? "全台" : region}縣市主要欄位</h2><p className="mt-1 text-sm text-soft">共 {filteredLocations.length} 個縣市，顯示第一個官方預報時段。</p></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-black text-brand-700">Wx · MaxT · MinT · CI · PoP</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-brand-100 text-xs font-black text-soft"><th className="px-3 py-3">縣市</th><th className="px-3 py-3">Wx 天氣現象</th><th className="px-3 py-3">MaxT 最高溫</th><th className="px-3 py-3">MinT 最低溫</th><th className="px-3 py-3">CI 舒適度</th><th className="px-3 py-3">PoP 降雨機率</th><th className="px-3 py-3">預報時段</th></tr></thead><tbody className="divide-y divide-brand-50">{filteredLocations.map((location) => { const period = location.periods[0]; return <tr key={location.locationName} className="hover:bg-brand-50/50"><td className="px-3 py-3 font-black text-main">{location.locationName}</td><td className="px-3 py-3 text-main">{period?.summary || "—"}</td><td className="px-3 py-3 text-main">{period?.maxTemperature ?? "—"}°C</td><td className="px-3 py-3 text-main">{period?.minTemperature ?? "—"}°C</td><td className="px-3 py-3 text-main">{period?.comfortIndex || "—"}</td><td className="px-3 py-3 text-main">{period?.precipitationProbability ?? "—"}%</td><td className="px-3 py-3 text-xs text-soft">{period ? periodLabel(period) : "—"}</td></tr>; })}</tbody></table></div><p className="mt-5 text-xs leading-5 text-soft">資料來源：中央氣象署「一般天氣預報-今明36小時天氣預報」；官方資料每 6 小時更新。</p></section>}
  </main>;
}
