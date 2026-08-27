"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Info, MapPin, RefreshCw, Sparkles, Users, WalletCards, X, MessageSquare, Layout } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BetaBadge } from "@/components/beta-badge";
import { PlannerChat } from "@/components/planner-chat";

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

type WeatherPeriod = {
  label: string;
  summary: string;
  weatherCode: number;
  temperature: number;
  precipitationProbability: number;
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
  periods?: WeatherPeriod[];
};
type Place = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  placeId: string | null;
  distanceMeters: number | null;
  imageUrl?: string;
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
  
  const allPlans: Plan[] = [
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
      match: 85,
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
      match: 80,
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
      match: 88,
      tags: ["全室內", "時間穩定", "聊天"],
      warnings: ["熱門電影場次可能較快售罄"],
    },
    {
      title: "美食馬拉松",
      emoji: "🍜",
      summary: "專為老饕設計，從下午茶一路吃到晚餐，絕對飽足。",
      stops: [
        { time: form.start, title: "特色甜點", detail: "排隊名店或隱藏版甜點", cost: Math.round(adjusted * 0.35), category: "catering.cafe" },
        { time: "16:30", title: "在地小吃", detail: "品嚐當地代表性美食", cost: Math.round(adjusted * 0.2), category: "catering.restaurant" },
        { time: "18:30", title: "精緻晚餐", detail: "氣氛佳的特色主餐", cost: Math.round(adjusted * 0.65), category: "catering.restaurant" },
      ],
      cost: Math.round(adjusted * 1.2),
      travel: "總移動約 35 分鐘",
      match: 82,
      tags: ["吃貨必備", "美食導向", "飽足感"],
      warnings: ["部分店家可能僅收現金"],
    }
  ];

  // Scoring logic based on form
  const scored = allPlans.map(plan => {
    let score = plan.match;
    // Vibe match
    if (form.vibe === "輕鬆聊天" && plan.tags.includes("聊天")) score += 10;
    if (form.vibe === "拍照打卡" && plan.tags.includes("拍照")) score += 10;
    if (form.vibe === "美食優先" && plan.tags.includes("美食導向")) score += 15;
    if (form.vibe === "輕鬆聊天" && plan.tags.includes("聊天友善")) score += 8;
    
    // Indoor match
    if (rainSafe && plan.tags.includes("室內")) score += 12;
    if (rainSafe && plan.tags.includes("全室內")) score += 15;
    
    // Budget match
    if (plan.cost <= form.budget) score += 5;
    
    return { ...plan, match: Math.min(99, score) };
  });

  // Sort by score and take top 3
  return scored.sort((a, b) => b.match - a.match).slice(0, 3);
}

export function PlannerClient() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [me, setMe] = useState<any>(null);
  const [meLoading, setMeLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          setMe(d?.user ?? null);
          setMeLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setMeLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [seed, setSeed] = useState(1);
  const [selectedQuick, setSelectedQuick] = useState("");
  const [plannerMode, setPlannerMode] = useState<"form" | "chat">("form");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationNote, setGenerationNote] = useState("");
  const [generationRequested, setGenerationRequested] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    // 檢查是否為第一次進入 Planner，如果是則顯示指南
    const hasSeenGuide = window.localStorage.getItem("joinjoy:planner-guide-seen");
    if (!hasSeenGuide && me) {
      // 使用 setTimeout 確保在下一個事件循環中觸發，避免同步 setState 警告
      const timer = setTimeout(() => {
        setGuideModalOpen(true);
        window.localStorage.setItem("joinjoy:planner-guide-seen", "true");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [me]);
  const [routeError, setRouteError] = useState("");
  const [routes, setRoutes] = useState<Record<string, Plan["route"]>>({});
  const [places, setPlaces] = useState<Record<string, Array<Place | null>>>({});
  const plans = useMemo(() => buildPlans({ ...form, indoor: form.indoor || Boolean(weather?.rainy) }, seed), [form, seed, weather?.rainy]);

  function generatePlans() {
    setGenerationRequested(true);
    setGenerationNote("");
    setSeed((value) => value + 1);
  }

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
      if (generationRequested) {
        setGenerating(true);
        setGenerationNote("");
      }
      setRouteLoading(true);
      setRouteError("");
      const nextPlaces: Record<string, Array<Place | null>> = {};
      const nextRoutes: Record<string, Plan["route"]> = {};
      let placesServiceResponded = false;
      let placesServiceError = "";
      try {
        await Promise.all(plans.map(async (plan) => {
          const placesResponse = await fetch("/api/planner/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin: form.origin, stops: plan.stops.map((stop) => ({ query: stop.title, category: stop.category })) }),
          });
          const placesPayload = await placesResponse.json().catch(() => null) as { places?: Array<Place | null>; error?: string } | null;
          const placesData = placesResponse.ok ? placesPayload : null;
          if (placesResponse.ok) placesServiceResponded = true;
          else if (!placesServiceError && placesPayload?.error) placesServiceError = placesPayload.error;
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
          if (!placesServiceResponded) {
            setRouteError(placesServiceError ? `${placesServiceError}，已保留規劃器方案。` : "地點服務暫時無法使用，已保留規劃器方案。");
          }
          setGenerationNote("已為你生成 3 條城市路線");
          if (typeof document !== "undefined") document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch {
        if (!cancelled) setRouteError(placesServiceError ? `${placesServiceError}，已保留規劃器方案。` : "地點或路線服務暫時無法使用，已保留規劃器方案。");
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
          if (generationRequested) setGenerating(false);
        }
      }
    }
    void loadPlacesAndRoutes();
    return () => { cancelled = true; };
  }, [form.origin, form.transport, plans, generationRequested]);

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
    const planPlaces = places[plan.title] || [];
    // 提取第一張有圖片的地點照片作為活動封面
    const coverImage = planPlaces.find(p => p?.imageUrl)?.imageUrl;

    window.localStorage.setItem("joinjoy:planner-preset", JSON.stringify({
      title: `${plan.emoji} ${plan.title}｜朋友出遊`,
      description: `${plan.summary}${weather ? `\n\n天氣：${weather.summary}，${weather.minTemperature}–${weather.maxTemperature}°C，降雨機率 ${weather.precipitationProbability}%。${weather.recommendation}` : ""}\n\n行程安排：\n${plan.stops.map((stop, index) => `${stop.time}｜${planPlaces[index]?.name || stop.title}：${planPlaces[index]?.address || stop.detail}`).join("\n")}\n\n預估每人 $${plan.cost}，${route ? `Geoapify 路線約 ${route.distanceKm} 公里、${route.durationMinutes} 分鐘` : plan.travel}。\n\n由 AI 出遊規劃器產生，可依實際情況調整。`,
      eventDate: form.date,
      startTime: form.start,
      endTime: form.end,
      capacity: form.people,
      fee: plan.cost,
      region: form.origin,
      tags: [...plan.tags, "AI 出遊規劃"],
      aiItinerary: { ...plan, stops: plan.stops.map((s, i) => ({ ...s, place: planPlaces[i] })) },
      isAiPlanned: true,
      imageUrl: coverImage,
    }));
    router.push("/events/create?planner=1");
  }
  async function sharePlan(plan: Plan) {
    const route = routes[plan.title];
    const text = `✨ JoinJoy AI 出遊方案推薦：${plan.emoji} ${plan.title} ✨\n\n` +
      `📝 方案簡介：${plan.summary}\n` +
      `📅 預計日期：${form.date}\n` +
      `💰 預估每人：$${plan.cost}\n` +
      `🎯 匹配程度：${plan.match}%\n\n` +
      `🕒 行程安排：\n` +
      plan.stops.map((stop, i) => {
        const placeName = places[plan.title]?.[i]?.name || stop.title;
        return `${stop.time}｜${placeName}\n   📍 ${places[plan.title]?.[i]?.address || stop.detail}`;
      }).join("\n\n") +
      `\n\n🚗 交通估算：${route ? `${route.distanceKm} km｜約 ${route.durationMinutes} 分鐘` : plan.travel}\n` +
      `🔗 立即查看並開團：${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `JoinJoy 行程：${plan.title}`, text });
      } catch (err) {
        await navigator.clipboard.writeText(text);
        setGenerationNote("行程已複製到剪貼簿！");
      }
    } else {
      await navigator.clipboard.writeText(text);
      setGenerationNote("行程已複製到剪貼簿！");
    }
  }

  if (!me) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
        <div className="rounded-[28px] border border-[var(--color-border)] bg-surface p-10 shadow-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/10">
            <Users className="text-brand-500" size={32} />
          </div>
          <h1 className="text-2xl font-black text-main">AI 出遊規劃需要登入</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-soft">
            城市探索 AI 規劃器會使用你的出發地與偏好生成揪團方案，登入後也能直接一鍵開團。
          </p>
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a href="/login" className="btn-brand rounded-full px-8 py-3 text-sm font-bold">前往登入</a>
            <button onClick={() => router.push("/")} className="rounded-full border border-[var(--color-border)] bg-surface px-8 py-3 text-sm font-bold text-main hover:border-brand-400">回到首頁</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app text-main">
      <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[linear-gradient(135deg,var(--color-brand-50),var(--color-cream-50),var(--color-coral-50))]">
        <div className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full border border-brand-200" />
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
          <div className="mb-4 flex items-center gap-3">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-brand-500"><Sparkles size={15} /> CITY EXPLORER / AI PLANNER</p>
            <span className="rounded-md bg-brand-500 px-2 py-0.5 text-[10px] font-black tracking-wider text-white">BETA</span>
          </div>
          <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">別再問「要去哪？」<br /><span className="text-brand-400">讓城市替你安排。</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-main md:text-lg">輸入你們的時間、預算與喜好，得到能直接揪團的完整出遊方案。</p>
          <div className="mt-6 flex max-w-2xl items-start gap-3 rounded-2xl border border-coral-500/20 bg-coral-50/50 p-4 text-xs leading-relaxed text-coral-700">
            <span className="mt-0.5 shrink-0 rounded-full bg-coral-500 p-1 text-white"><Sparkles size={10} /></span>
            <p>
              <strong>AI 生成提醒：</strong>本功能使用人工智慧技術輔助規劃，行程中的店家資訊、天氣預測及路線時間僅供參考。實際狀況（如營業時間、訂位情形、路況）請以現場或官方資訊為準。
            </p>
          </div><div className="mt-7 grid max-w-2xl grid-cols-3 gap-2 rounded-2xl border border-brand-500/20 bg-surface/80 p-2 text-[10px] uppercase tracking-wider text-soft sm:text-xs"><div className="rounded-xl bg-brand-400/10 px-3 py-2"><span className="mb-1 block h-1.5 w-1.5 rounded-full bg-brand-500" />條件鎖定</div><div className={`rounded-xl px-3 py-2 ${weatherLoading ? "bg-coral-50 text-coral-500" : weather ? "bg-brand-500/10 text-brand-500" : "bg-[var(--color-bg-soft)]"}`}><span className={`mb-1 block h-1.5 w-1.5 rounded-full ${weatherLoading ? "bg-coral-500" : weather ? "bg-brand-500" : "bg-brand-300"}`} />{weatherLoading ? "天氣掃描中" : weather ? "天氣已同步" : "等待天氣"}</div><div className={`rounded-xl px-3 py-2 ${routeLoading ? "bg-coral-50 text-coral-500" : routes[plans[0]?.title] ? "bg-brand-400/10 text-brand-700" : "bg-[var(--color-bg-soft)]"}`}><span className={`mb-1 block h-1.5 w-1.5 rounded-full ${routeLoading ? "bg-coral-500" : routes[plans[0]?.title] ? "bg-brand-400" : "bg-brand-300"}`} />{routeLoading ? "路線計算中" : routes[plans[0]?.title] ? "路線已就緒" : "等待路線"}</div></div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-3xl border border-brand-500/20 bg-surface p-5 shadow-2xl shadow-black/20 md:p-7">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500">01 / SET THE MOOD</p>
                <h2 className="mt-1 text-2xl font-black">先告訴我你們想怎麼玩</h2>
                <p className="mt-2 text-xs text-soft">你的條件只會用來生成這次出遊方案。</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-full bg-app-soft p-1">
                  <button onClick={() => setPlannerMode("form")} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition ${plannerMode === "form" ? "bg-white text-brand-600 shadow-sm" : "text-soft hover:text-main"}`}><Layout size={12} /> 表單模式</button>
                  <button onClick={() => setPlannerMode("chat")} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition ${plannerMode === "chat" ? "bg-white text-brand-600 shadow-sm" : "text-soft hover:text-main"}`}><MessageSquare size={12} /> 對話模式</button>
                </div>
                <Link href="/planner/guide" className="flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:text-brand-400 transition-colors">
                  <Info size={14} /> 使用指南
                </Link>
              </div>
            </div>

            {plannerMode === "chat" ? (
              <PlannerChat 
                currentForm={form} 
                onComplete={(newForm) => {
                  setForm(prev => ({ ...prev, ...newForm }));
                  setPlannerMode("form");
                }} 
              />
            ) : (
              <>
                <div className="flex flex-wrap gap-2">{quickStarts.map((item) => <button key={item} onClick={() => handleQuickStart(item)} className={`rounded-full border px-3 py-2 text-sm transition ${selectedQuick === item ? "border-brand-500 bg-brand-500 text-white" : "border-[var(--color-border)] text-main hover:border-brand-400"}`}>{item}</button>)}</div>
              </>
            )}
            <p className="mb-3 mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-soft">基本條件 / BASIC SIGNALS</p><div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-main">人數<input type="number" min="1" max="30" value={form.people} onChange={(e) => update("people", Number(e.target.value))} className="planner-input" /></label>
              <label className="text-sm text-main">每人預算<input type="number" min="100" value={form.budget} onChange={(e) => update("budget", Number(e.target.value))} className="planner-input" /></label>
              <label className="text-sm text-main">出發日期<input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className="planner-input" /></label>
              <label className="text-sm text-main">出發地<input value={form.origin} onChange={(e) => update("origin", e.target.value)} className="planner-input" placeholder="例如：台中" /></label>
              <label className="text-sm text-main">開始時間<input type="time" value={form.start} onChange={(e) => update("start", e.target.value)} className="planner-input" /></label>
              <label className="text-sm text-main">最晚回家<input type="time" value={form.end} onChange={(e) => update("end", e.target.value)} className="planner-input" /></label>
            </div>
            <div className="mt-4 rounded-2xl border border-brand-400/20 bg-[var(--color-bg-soft)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-400">LIVE WEATHER SCAN</p><p className="mt-1 text-sm font-bold text-main">{weatherLoading ? "正在讀取天氣…" : weather ? `${weather.location.name}｜${weather.summary}` : "輸入日期與出發地後掃描"}</p>{weather && <p className="mt-1 text-xs text-soft">{weather.minTemperature}–{weather.maxTemperature}°C｜降雨機率 {weather.precipitationProbability}%｜雨量 {weather.precipitationMm} mm</p>}{weather?.periods && weather.periods.length > 0 && <div className="mt-2 grid grid-cols-3 gap-1.5">{weather.periods.map((period) => <div key={period.label} className="rounded-xl bg-surface p-2 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-brand-400">{period.label}</p><p className="mt-0.5 text-xs font-bold text-main">{period.summary}</p><p className="mt-0.5 text-[10px] text-soft">{period.temperature}°C｜雨 {period.precipitationProbability}%</p></div>)}</div>}{weatherError && <p className="mt-1 text-xs text-coral-500">{weatherError}</p>}{weather && <p className="mt-2 text-xs text-brand-500">{weather.recommendation}</p>}</div><span className="rounded-full bg-brand-400/10 px-2 py-1 text-xs text-brand-700">{weather?.rainy ? "雨備模式" : weather ? "可探索" : "等待"}</span></div></div>
            <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-soft">移動範圍 / MOBILITY</p><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-main">交通方式<select value={form.transport} onChange={(e) => update("transport", e.target.value)} className="planner-input"><option>大眾運輸</option><option>自行開車</option><option>機車</option><option>走路</option></select></label><label className="text-sm text-main">接受距離<select value={form.distance} onChange={(e) => update("distance", e.target.value)} className="planner-input"><option>3 公里內</option><option>10 公里內</option><option>30 公里內</option><option>不限距離</option></select></label></div>
            <p className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-soft">偏好訊號 / VIBE</p><div><p className="mb-2 text-sm text-main">活動風格</p><div className="flex flex-wrap gap-2">{vibes.map((item) => <button key={item} onClick={() => update("vibe", item)} className={`rounded-lg px-3 py-2 text-sm ${form.vibe === item ? "bg-brand-400 font-bold text-white" : "bg-brand-50 text-brand-700"}`}>{item}</button>)}</div></div>
            <label className="mt-5 flex items-center gap-3 text-sm text-main"><input type="checkbox" checked={form.indoor} onChange={(e) => update("indoor", e.target.checked)} className="h-4 w-4 accent-brand-500" />優先安排室內或雨備方案</label>
            <label className="mt-5 block text-sm text-main">還有什麼不能妥協？<textarea value={form.custom} onChange={(e) => update("custom", e.target.value)} className="planner-input min-h-24 resize-none" placeholder="例如：不要太吵、希望可以坐很久聊天、不要走太多路" /></label>
            <button disabled={generating} onClick={generatePlans} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 font-black text-white transition hover:bg-brand-400 disabled:opacity-60"><Sparkles size={17} /> {generating ? "正在生成城市方案…" : "生成我的城市方案"}</button>
          </div>

          <div id="plans" className="space-y-4"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-400">02 / AI SHORTLIST</p><h2 className="mt-1 text-2xl font-black">為你排出的 3 條路線</h2>{generating && <p className="mt-1 text-xs text-brand-400">正在搜尋附近真實地點並計算路線…</p>}{routeLoading && !generating && <p className="mt-1 text-xs text-brand-400">正在計算路線…</p>}{routeError && <p className="mt-1 text-xs text-coral-500">{routeError}</p>}{generationNote && <p className="mt-1 text-xs font-bold text-brand-500">{generationNote}</p>}</div><button disabled={generating} onClick={() => { setGenerationRequested(true); setGenerationNote(""); setSeed((value) => value + 1); }} className="flex items-center gap-1 text-sm text-soft hover:text-brand-500 disabled:opacity-60"><RefreshCw size={15} /> 再生成</button></div>
            {plans.map((plan, planIndex) => <article key={plan.title} className="rounded-3xl border border-[var(--color-border)] bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand-400/60 md:p-6"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="text-3xl">{plan.emoji}</span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-black">{plan.title}</h3>{planIndex === 0 && <span className="rounded-full bg-brand-500 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">最佳匹配</span>}</div><p className="mt-1 text-sm leading-6 text-main">{plan.summary}</p></div></div><div className="rounded-2xl bg-brand-500/10 px-3 py-2 text-right"><p className="text-2xl font-black text-brand-500">{plan.match}%</p><p className="text-[10px] uppercase tracking-wider text-soft">match</p></div></div>            {/* 行程表專區 - 強化視覺 */}
            <div className="mt-6 rounded-2xl bg-app-soft/30 p-4">
              <p className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">
                <Layout size={12} /> 行程表專區 / ITINERARY
              </p>
              <div className="space-y-5">
                {plan.stops.map((stop, i) => {
                  const place = places[plan.title]?.[i];
                  return (
                    <div key={i} className="group relative flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-500/20 bg-surface text-xl shadow-sm transition group-hover:scale-110 group-hover:border-brand-500/50">
                          {stop.category.includes("catering") ? "🍽️" : stop.category.includes("cinema") ? "🎬" : "📍"}
                        </div>
                        {i !== plan.stops.length - 1 && <div className="mt-2 h-full w-px bg-brand-500/20" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-brand-500 px-2 py-0.5 text-[10px] font-black text-white">{stop.time}</span>
                            <button 
                              onClick={() => {
                                if (place) {
                                  setSelectedPlace(place);
                                  setPlaceModalOpen(true);
                                }
                              }}
                              className="text-sm font-black hover:text-brand-500 transition-colors"
                            >
                              {place?.name || stop.title}
                            </button>
                          </div>
                          {place && (
                            <button 
                              onClick={() => {
                                setSelectedPlace(place);
                                setPlaceModalOpen(true);
                              }}
                              className="text-soft hover:text-brand-500"
                            >
                              <Info size={14} />
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-soft line-clamp-1">{place?.address || stop.detail}</p>
                        
                        {/* 圖片展示 */}
                        {place?.imageUrl && (
                          <div 
                            className="mt-3 cursor-pointer overflow-hidden rounded-xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all"
                            onClick={() => {
                              setSelectedPlace(place);
                              setPlaceModalOpen(true);
                            }}
                          >
                            <img src={place.imageUrl} alt={place.name} className="h-32 w-full object-cover transition-transform hover:scale-105" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div><div className="mt-5 flex flex-wrap gap-2">{plan.tags.map((tag) => <span key={tag} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs text-brand-700">#{tag}</span>)}</div><div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-soft">預估每人</p><p className="font-bold text-main">${plan.cost} <span className={plan.cost <= form.budget ? "text-brand-500" : "text-rose-300"}>{plan.cost <= form.budget ? "預算內" : "超出"}</span></p></div><div><p className="text-xs text-soft">交通</p><p className="font-bold text-main">{routes[plan.title] ? `${routes[plan.title]!.distanceKm} km｜${routes[plan.title]!.durationMinutes} 分鐘` : plan.travel}</p><p className="mt-1 text-[10px] text-soft">{routes[plan.title] ? "Geoapify 路線估算" : "等待地點定位"}</p></div></div>{plan.warnings.map((warning) => <p key={warning} className="mt-3 text-xs text-coral-500">⚠ {warning}</p>)}<div className="mt-5 flex flex-col gap-2 sm:flex-row"><button onClick={() => openGroup(plan)} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-400 px-4 py-3 text-sm font-black text-white shadow-lg shadow-black/30 hover:bg-brand-200"><Users size={16} /> 一鍵開團</button><button onClick={() => { setSelectedPlan(plan); setShareOpen(true); }} className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-3 text-sm font-bold text-slate-200 hover:border-brand-500"><Copy size={16} /></button></div></article>)}
          </div>
        </section>
      </main>

      {shareOpen && selectedPlan && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-md rounded-3xl border border-brand-500/20 bg-surface p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 className="text-xl font-black">邀請朋友一起決定</h3><button onClick={() => setShareOpen(false)} className="text-soft"><X size={20} /></button></div><p className="mt-3 text-sm text-main">先把「{selectedPlan.title}」分享給朋友，大家可以一起比較方案。</p><div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--color-bg-soft)] p-3 text-xs"><div><p className="text-soft">活動日期</p><p className="mt-1 font-bold text-main">{form.date || "尚未設定"}</p></div><div><p className="text-soft">參加人數</p><p className="mt-1 font-bold text-main">{form.people} 人</p></div>{weather && <div className="col-span-2 border-t border-[var(--color-border)] pt-2"><p className="text-soft">天氣偵測</p><p className="mt-1 font-bold text-brand-500">{weather.summary}｜{weather.minTemperature}–{weather.maxTemperature}°C｜降雨 {weather.precipitationProbability}%</p></div>}</div><button onClick={() => sharePlan(selectedPlan)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 font-black text-white"><Copy size={16} /> 複製／分享方案</button><button onClick={() => openGroup(selectedPlan)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-400 px-4 py-3 font-bold text-brand-400"><ArrowRight size={16} /> 確認方案並一鍵開團</button></div></div>}
      {shareOpen && !selectedPlan && <div className="fixed bottom-5 right-5 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white">已複製分享內容</div>}

      {/* Place Detail Modal */}
      {placeModalOpen && selectedPlace && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-[2.5rem] border border-brand-500/10 bg-surface shadow-2xl animate-in zoom-in-95 duration-300">
            {selectedPlace.imageUrl ? (
              <div className="relative h-56 w-full">
                <img 
                  src={selectedPlace.imageUrl} 
                  alt={selectedPlace.name} 
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <button 
                  onClick={() => setPlaceModalOpen(false)} 
                  className="absolute right-5 top-5 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 backdrop-blur-md transition-all"
                >
                  <X size={20} />
                </button>
                <div className="absolute bottom-6 left-8 right-8">
                  <div className="flex items-center gap-2 text-brand-400">
                    <MapPin size={14} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Location Detail</span>
                  </div>
                  <h3 className="mt-1 text-2xl font-black text-white leading-tight">{selectedPlace.name}</h3>
                </div>
              </div>
            ) : (
              <div className="relative bg-brand-500 p-10 text-center">
                <button 
                  onClick={() => setPlaceModalOpen(false)} 
                  className="absolute right-5 top-5 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all"
                >
                  <X size={20} />
                </button>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-white shadow-inner">
                  <MapPin size={36} />
                </div>
                <h3 className="mt-4 text-2xl font-black text-white leading-tight">{selectedPlace.name}</h3>
              </div>
            )}
            
            <div className="p-8">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500/60">地址資訊 / ADDRESS</p>
                  <p className="mt-2 text-sm font-bold text-main leading-relaxed">{selectedPlace.address || "暫無詳細地址資訊"}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-soft">距離起點 / DISTANCE</p>
                    <p className="mt-1 text-lg font-black text-main">
                      {selectedPlace.distanceMeters ? `${(selectedPlace.distanceMeters / 1000).toFixed(1)} km` : "計算中…"}
                    </p>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedPlace.name} ${selectedPlace.address}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-brand flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white shadow-lg shadow-brand-500/20 hover:-translate-y-0.5 transition-all"
                  >
                    Google Maps <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
              
              <button 
                onClick={() => setPlaceModalOpen(false)}
                className="mt-8 w-full rounded-2xl bg-app-soft py-4 text-sm font-black text-soft hover:bg-brand-500/10 hover:text-brand-600 transition-all"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guide Modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-500">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-brand-500/20 bg-surface shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="relative bg-brand-500 p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 text-white shadow-inner">
                <Sparkles size={40} />
              </div>
              <h2 className="mt-6 text-3xl font-black text-white">歡迎使用 AI 規劃器</h2>
              <p className="mt-2 text-brand-100">開始探索你的專屬揪團方案</p>
            </div>
            
            <div className="p-8">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 font-black">1</div>
                  <div>
                    <p className="font-black text-main">輸入偏好或對話</p>
                    <p className="mt-1 text-sm text-soft">告訴 AI 你們的人數、預算與想玩的風格，或是直接用語音/文字對話描述。</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 font-black">2</div>
                  <div>
                    <p className="font-black text-main">生成與挑選方案</p>
                    <p className="mt-1 text-sm text-soft">AI 會為你找出真實的地點、規劃路線並偵測天氣，你可以挑選最滿意的方案。</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500 font-black">3</div>
                  <div>
                    <p className="font-black text-main">一鍵開團出發</p>
                    <p className="mt-1 text-sm text-soft">點擊開團，行程與圖片會自動同步到揪團頁面，邀請朋友就能立刻出發！</p>
                  </div>
                </div>
                
                <div className="rounded-2xl bg-coral-50 p-4 text-xs text-coral-700">
                  <p>⚠️ <strong>注意：</strong>AI 生成內容僅供參考，請務必確認店家的實際營業狀況與預約需求。</p>
                </div>
              </div>
              
              <button 
                onClick={() => setGuideModalOpen(false)}
                className="mt-8 w-full rounded-2xl bg-brand-500 py-4 text-lg font-black text-white shadow-lg shadow-brand-500/30 hover:-translate-y-1 transition-all"
              >
                我知道了，開始規劃！
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
