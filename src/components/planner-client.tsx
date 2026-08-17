"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, MapPin, RefreshCw, Sparkles, Users, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";

const quickStarts = ["吃飯", "玩樂", "逛街", "看電影", "景點", "聊天放鬆", "隨機決定"];
const vibes = ["輕鬆聊天", "拍照打卡", "刺激好玩", "美食優先", "購物逛街"];

type PlannerForm = {
  people: number;
  budget: number;
  date: string;
  start: string;
  end: string;
  origin: string;
  distance: string;
  transport: string;
  vibe: string;
  indoor: boolean;
  custom: string;
};

type Weather = {
  date: string;
  location: { name: string; admin1: string | null; latitude: number; longitude: number };
  summary: string;
  weatherCode: number;
  minTemperature: number;
  maxTemperature: number;
  precipitationProbability: number;
  precipitationMm: number;
  windSpeed: number;
  rainy: boolean;
  hot: boolean;
  recommendation: string;
};
type Place = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  placeId: string | null;
  distanceMeters: number | null;
};

type Plan = {
  title: string;
  emoji: string;
  summary: string;
  stops: { time: string; title: string; detail: string; cost: number; category: string; place?: Place }[];
  cost: number;
  travel: string;
  match: number;
  tags: string[];
  warnings: string[];
  route?: { distanceKm: number; durationMinutes: number; waypoints: string[] };
};

const initialForm: PlannerForm = {
  people: 4,
  budget: 500,
  date: "",
  start: "14:00",
  end: "20:00",
  origin: "台中",
  distance: "10 公里內",
  transport: "大眾運輸",
  vibe: "輕鬆聊天",
  indoor: true,
  custom: "",
};

function buildPlans(form: PlannerForm, seed: number): Plan[] {
  const budget = Math.max(100, form.budget);
  const rainSafe = form.indoor;
  const adjusted = Math.round(budget * (0.78 + ((seed % 3) * 0.04)));
  const plans: Plan[] = [
    {
      title: "吃飯＋桌遊",
      emoji: "🎲",
      summary: "適合邊吃邊聊天，行程節奏輕鬆，移動距離短。",
      stops: [
        { time: form.start, title: "特色餐廳", detail: "選擇適合多人聊天的餐廳", cost: Math.round(adjusted * 0.58), category: "catering.restaurant" },
        { time: "15:40", title: "桌遊店", detail: "室內活動，不受天氣影響", cost: Math.round(adjusted * 0.3), category: "activity" },
        { time: "18:00", title: "飲料休息", detail: "找一間可以久坐的咖啡廳", cost: Math.round(adjusted * 0.12), category: "catering.cafe" },
      ],
      cost: adjusted,
      travel: "總移動約 25 分鐘",
      match: rainSafe ? 94 : 88,
      tags: ["聊天友善", "室內", "低移動"],
      warnings: ["熱門時段建議提前訂位"],
    },
    {
      title: "景點＋晚餐",
      emoji: "🌆",
      summary: "先探索城市，再用一頓晚餐收尾，適合想拍照的朋友。",
      stops: [
        { time: form.start, title: "城市景點", detail: rainSafe ? "雨備室內展館" : "適合拍照的城市景點", cost: Math.round(adjusted * 0.24), category: "tourism" },
        { time: "16:40", title: "自由散步", detail: "沿途保留彈性，不安排太緊", cost: 0, category: "tourism" },
        { time: "18:00", title: "晚餐", detail: "依照人數選擇方便集合的餐廳", cost: Math.round(adjusted * 0.76), category: "catering.restaurant" },
      ],
      cost: Math.round(adjusted * 1.05),
      travel: "總移動約 55 分鐘",
      match: rainSafe ? 82 : 91,
      tags: ["拍照", "城市探索", "彈性高"],
      warnings: rainSafe ? ["室外路段遇雨需切換雨備方案"] : ["假日可能需要排隊"],
    },
    {
      title: "電影＋咖啡廳",
      emoji: "🎬",
      summary: "全程室內、時間好掌握，最適合不想冒險又想見面的聚會。",
      stops: [
        { time: form.start, title: "電影院", detail: "選擇交通方便的場次", cost: Math.round(adjusted * 0.52), category: "entertainment.cinema" },
        { time: "17:30", title: "咖啡廳", detail: "觀影後找地方慢慢聊天", cost: Math.round(adjusted * 0.22), category: "catering.cafe" },
        { time: "19:00", title: "簡單晚餐", detail: "保留回家緩衝時間", cost: Math.round(adjusted * 0.38), category: "catering.restaurant" },
      ],
      cost: Math.round(adjusted * 1.12),
      travel: "總移動約 20 分鐘",
      match: 86,
      tags: ["全室內", "時間穩定", "聊天"],
      warnings: ["熱門電影場次可能較快售罄"],
    },
  ];
  return plans.map((plan, index) => ({ ...plan, match: Math.max(70, Math.min(98, plan.match + ((seed + index) % 3) - 1)) }));
}

export function PlannerClient() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [seed, setSeed] = useState(1);
  const [selectedQuick, setSelectedQuick] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [routes, setRoutes] = useState<Record<string, Plan["route"]>>({});
  const [places, setPlaces] = useState<Record<string, Array<Place | null>>>({});
  const plans = useMemo(() => buildPlans({ ...form, indoor: form.indoor || Boolean(weather?.rainy) }, seed), [form, seed, weather?.rainy]);

  useEffect(() => {
    let cancelled = false;
    async function loadWeather() {
      if (!form.origin.trim() || !form.date) {
        setWeather(null);
        setWeatherError("");
        return;
      }
      setWeatherLoading(true);
      setWeatherError("");
      try {
        const response = await fetch("/api/planner/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin: form.origin, date: form.date }),
        });
        const data = (await response.json().catch(() => null)) as Weather | { error?: string } | null;
        if (!response.ok) throw new Error(data && "error" in data ? data.error : "天氣服務暫時無法使用");
        if (!cancelled) setWeather(data as Weather);
      } catch (error) {
        if (!cancelled) {
          setWeather(null);
          setWeatherError(error instanceof Error ? error.message : "天氣服務暫時無法使用");
        }
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    }
    void loadWeather();
    return () => { cancelled = true; };
  }, [form.origin, form.date]);

  useEffect(() => {
    let cancelled = false;
    async function loadPlacesAndRoutes() {
      if (!form.origin.trim()) return;
      setRouteLoading(true);
      setRouteError("");
      const nextPlaces: Record<string, Array<Place | null>> = {};
      const nextRoutes: Record<string, Plan["route"]> = {};
      let placesServiceResponded = false;
      try {
        await Promise.all(plans.map(async (plan) => {
          const placesResponse = await fetch("/api/planner/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin: form.origin, stops: plan.stops.map((stop) => ({ query: stop.title, category: stop.category })) }),
          });
          const placesData = placesResponse.ok ? (await placesResponse.json()) as { places?: Array<Place | null> } : null;
          if (placesResponse.ok) placesServiceResponded = true;
          const planPlaces = placesData?.places || [];
          nextPlaces[plan.title] = planPlaces;
          const destinations = planPlaces.filter((place): place is Place => Boolean(place)).map((place) => place.address || place.name);
          if (!destinations.length) return;
          const routeResponse = await fetch("/api/planner/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin: form.origin, destinations, mode: form.transport }),
          });
          if (routeResponse.ok) nextRoutes[plan.title] = (await routeResponse.json()) as Plan["route"];
        }));
        if (!cancelled) {
          setPlaces(nextPlaces);
          setRoutes(nextRoutes);
          if (!placesServiceResponded) setRouteError("地點服務暫時無法使用，已保留規劃器方案。 ");
        }
      } catch {
        if (!cancelled) setRouteError("地點或路線服務暫時無法使用，已保留規劃器方案。 ");
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    }
    void loadPlacesAndRoutes();
    return () => { cancelled = true; };
  }, [form.origin, form.transport, plans]);

  function update<K extends keyof PlannerForm>(key: K, value: PlannerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleQuickStart(value: string) {
    setSelectedQuick(value);
    const nextVibe = value === "聊天放鬆" ? "輕鬆聊天" : value === "隨機決定" ? vibes[seed % vibes.length] : value === "吃飯" ? "美食優先" : form.vibe;
    update("vibe", nextVibe);
  }

  function openGroup(plan: Plan) {
    const route = routes[plan.title];
    window.localStorage.setItem("joinjoy:planner-preset", JSON.stringify({
      title: `${plan.emoji} ${plan.title}｜朋友出遊`,
      description: `${plan.summary}${weather ? `\n\n天氣：${weather.summary}，${weather.minTemperature}–${weather.maxTemperature}°C，降雨機率 ${weather.precipitationProbability}%。${weather.recommendation}` : ""}\n\n行程安排：\n${plan.stops.map((stop, index) => `${stop.time}｜${stop.place?.name || places[plan.title]?.[index]?.name || stop.title}：${stop.place?.address || places[plan.title]?.[index]?.address || stop.detail}`).join("\n")}\n\n預估每人 $${plan.cost}，${route ? `Geoapify 路線約 ${route.distanceKm} 公里、${route.durationMinutes} 分鐘` : plan.travel}。\n\n由 AI 出遊規劃器產生，可依實際情況調整。`,
      eventDate: form.date,
      startTime: form.start,
      endTime: form.end,
      capacity: form.people,
      fee: plan.cost,
      region: form.origin,
      tags: [...plan.tags, "AI 出遊規劃"],
    }));
    router.push("/events/create?planner=1");
  }

  async function sharePlan(plan: Plan) {
    const text = `${plan.emoji} ${plan.title}\n${plan.summary}\n預估每人 $${plan.cost}｜${plan.match}% 符合條件`;
    if (navigator.share) await navigator.share({ title: "JoinJoy AI 出遊方案", text, url: window.location.href });
    else { await navigator.clipboard.writeText(`${text}\n${window.location.href}`); setShareOpen(true); }
  }

  return (
    <div className="min-h-screen bg-[#08131f] text-slate-100">
      <div className="relative overflow-hidden border-b border-cyan-400/15 bg-[radial-gradient(circle_at_80%_0%,rgba(0,220,190,.16),transparent_35%),linear-gradient(135deg,#08131f,#0d2030)]">
        <div className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full border border-cyan-300/10" />
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-[#67f5c8]"><Sparkles size={15} /> CITY EXPLORER / AI PLANNER</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">別再問「要去哪？」<br /><span className="text-[#58d9ff]">讓城市替你安排。</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">輸入你們的時間、預算與喜好，得到能直接揪團的完整出遊方案。</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-cyan-300/15 bg-[#0d2030]/90 p-5 shadow-2xl shadow-cyan-950/20 md:p-7">
            <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#67f5c8]">01 / SET THE MOOD</p><h2 className="mt-1 text-2xl font-black">先告訴我你們想怎麼玩</h2></div><MapPin className="text-[#58d9ff]" /></div>
            <div className="flex flex-wrap gap-2">{quickStarts.map((item) => <button key={item} onClick={() => handleQuickStart(item)} className={`rounded-full border px-3 py-2 text-sm transition ${selectedQuick === item ? "border-[#67f5c8] bg-[#67f5c8] text-[#07141e]" : "border-slate-600 text-slate-300 hover:border-[#58d9ff]"}`}>{item}</button>)}</div>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">人數<input type="number" min="1" max="30" value={form.people} onChange={(e) => update("people", Number(e.target.value))} className="planner-input" /></label>
              <label className="text-sm text-slate-300">每人預算<input type="number" min="100" value={form.budget} onChange={(e) => update("budget", Number(e.target.value))} className="planner-input" /></label>
              <label className="text-sm text-slate-300">出發日期<input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className="planner-input" /></label>
              <label className="text-sm text-slate-300">出發地<input value={form.origin} onChange={(e) => update("origin", e.target.value)} className="planner-input" placeholder="例如：台中" /></label>
              <label className="text-sm text-slate-300">開始時間<input type="time" value={form.start} onChange={(e) => update("start", e.target.value)} className="planner-input" /></label>
              <label className="text-sm text-slate-300">最晚回家<input type="time" value={form.end} onChange={(e) => update("end", e.target.value)} className="planner-input" /></label>
            </div>
            <div className="mt-4 rounded-2xl border border-[#58d9ff]/20 bg-[#0a1a28] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#58d9ff]">LIVE WEATHER SCAN</p><p className="mt-1 text-sm font-bold text-white">{weatherLoading ? "正在讀取天氣…" : weather ? `${weather.location.name}｜${weather.summary}` : "輸入日期與出發地後掃描"}</p>{weather && <p className="mt-1 text-xs text-slate-400">{weather.minTemperature}–{weather.maxTemperature}°C｜降雨機率 {weather.precipitationProbability}%｜雨量 {weather.precipitationMm} mm</p>}{weatherError && <p className="mt-1 text-xs text-amber-300">{weatherError}</p>}{weather && <p className="mt-2 text-xs text-[#67f5c8]">{weather.recommendation}</p>}</div><span className="rounded-full bg-[#58d9ff]/10 px-2 py-1 text-xs text-[#9deaff]">{weather?.rainy ? "雨備模式" : weather ? "可探索" : "等待"}</span></div></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-slate-300">交通方式<select value={form.transport} onChange={(e) => update("transport", e.target.value)} className="planner-input"><option>大眾運輸</option><option>自行開車</option><option>機車</option><option>走路</option></select></label><label className="text-sm text-slate-300">接受距離<select value={form.distance} onChange={(e) => update("distance", e.target.value)} className="planner-input"><option>3 公里內</option><option>10 公里內</option><option>30 公里內</option><option>不限距離</option></select></label></div>
            <div className="mt-4"><p className="mb-2 text-sm text-slate-300">活動風格</p><div className="flex flex-wrap gap-2">{vibes.map((item) => <button key={item} onClick={() => update("vibe", item)} className={`rounded-lg px-3 py-2 text-sm ${form.vibe === item ? "bg-[#58d9ff] font-bold text-[#06131e]" : "bg-[#132d40] text-slate-300"}`}>{item}</button>)}</div></div>
            <label className="mt-5 flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={form.indoor} onChange={(e) => update("indoor", e.target.checked)} className="h-4 w-4 accent-[#67f5c8]" />優先安排室內或雨備方案</label>
            <label className="mt-5 block text-sm text-slate-300">還有什麼不能妥協？<textarea value={form.custom} onChange={(e) => update("custom", e.target.value)} className="planner-input min-h-24 resize-none" placeholder="例如：不要太吵、希望可以坐很久聊天、不要走太多路" /></label>
            <button onClick={() => setSeed((value) => value + 1)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#67f5c8] px-5 py-3.5 font-black text-[#06131e] transition hover:bg-[#8ff8d8]"><Sparkles size={17} /> 生成我的城市方案</button>
          </div>

          <div id="plans" className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#58d9ff]">02 / AI SHORTLIST</p><h2 className="mt-1 text-2xl font-black">為你排出的 3 條路線</h2>{routeLoading && <p className="mt-1 text-xs text-cyan-300">正在用 Geoapify 計算路線…</p>}{routeError && <p className="mt-1 text-xs text-amber-300">{routeError}</p>}</div><button onClick={() => setSeed((value) => value + 1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-[#67f5c8]"><RefreshCw size={15} /> 再生成</button></div>
            {plans.map((plan) => <article key={plan.title} className="rounded-3xl border border-slate-700/80 bg-[#102536] p-5 transition hover:-translate-y-0.5 hover:border-[#58d9ff]/60 md:p-6"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="text-3xl">{plan.emoji}</span><div><h3 className="text-xl font-black">{plan.title}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{plan.summary}</p></div></div><div className="rounded-2xl bg-[#67f5c8]/10 px-3 py-2 text-right"><p className="text-2xl font-black text-[#67f5c8]">{plan.match}%</p><p className="text-[10px] uppercase tracking-wider text-slate-400">match</p></div></div><div className="mt-5 space-y-3 border-l border-[#58d9ff]/40 pl-4">{plan.stops.map((stop, index) => <div key={stop.time} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#58d9ff]" /><div className="flex justify-between gap-3"><p className="text-sm font-bold text-[#67f5c8]">{stop.time}｜{stop.title}</p><span className="text-xs text-slate-400">${stop.cost}</span></div><p className="text-xs text-slate-400">{places[plan.title]?.[index]?.name || stop.detail}</p>{places[plan.title]?.[index]?.address && <p className="mt-1 text-[11px] text-slate-500">{places[plan.title]?.[index]?.address}</p>}</div>)}</div><div className="mt-5 flex flex-wrap gap-2">{plan.tags.map((tag) => <span key={tag} className="rounded-full bg-[#18364a] px-2.5 py-1 text-xs text-[#9deaff]">#{tag}</span>)}</div><div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#0a1a28] p-3 text-sm"><div><p className="text-xs text-slate-500">預估每人</p><p className="font-bold text-white">${plan.cost} <span className={plan.cost <= form.budget ? "text-[#67f5c8]" : "text-rose-300"}>{plan.cost <= form.budget ? "預算內" : "超出"}</span></p></div><div><p className="text-xs text-slate-500">交通</p><p className="font-bold text-white">{routes[plan.title] ? `${routes[plan.title]!.distanceKm} km｜${routes[plan.title]!.durationMinutes} 分鐘` : plan.travel}</p><p className="mt-1 text-[10px] text-slate-500">{routes[plan.title] ? "Geoapify 路線估算" : "等待地點定位"}</p></div></div>{plan.warnings.map((warning) => <p key={warning} className="mt-3 text-xs text-amber-300">⚠ {warning}</p>)}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => openGroup(plan)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#58d9ff] px-4 py-3 text-sm font-black text-[#06131e] hover:bg-[#8ae7ff]"><Users size={16} /> 一鍵開團</button><button onClick={() => { setSelectedPlan(plan); setShareOpen(true); }} className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-bold text-slate-200 hover:border-[#67f5c8]"><Copy size={16} /></button></div></article>)}
          </div>
        </section>
      </main>

      {shareOpen && selectedPlan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-3xl border border-cyan-300/20 bg-[#102536] p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">邀請朋友一起決定</h3><button onClick={() => setShareOpen(false)} className="text-slate-400"><X size={20} /></button></div><p className="mt-3 text-sm text-slate-300">先把「{selectedPlan.title}」分享給朋友，大家可以一起比較方案。</p><button onClick={() => sharePlan(selectedPlan)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#67f5c8] px-4 py-3 font-black text-[#06131e]"><Copy size={16} /> 複製／分享方案</button><button onClick={() => openGroup(selectedPlan)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-[#58d9ff] px-4 py-3 font-bold text-[#58d9ff]"><ArrowRight size={16} /> 確認方案並一鍵開團</button></div></div>}
      {shareOpen && !selectedPlan && <div className="fixed bottom-5 right-5 rounded-xl bg-[#67f5c8] px-4 py-3 text-sm font-bold text-[#06131e]">已複製分享內容</div>}
    </div>
  );
}
