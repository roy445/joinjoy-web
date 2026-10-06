import { NextRequest, NextResponse } from "next/server";
import { CWA_CACHE_TTL_SECONDS, fetchCwaForecast, taiwanNow } from "@/lib/cwa-weather";

type WeatherRequest = { origin?: string; date?: string };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function todayInTaiwan() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city")?.trim();
  if (request.nextUrl.searchParams.get("all") === "1") return getAllWeather();
  if (!city) return jsonError("請提供縣市名稱，例如：台北市", 400);
  return getWeather(city, todayInTaiwan());
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as WeatherRequest | null;
  const origin = body?.origin?.trim();
  const date = body?.date?.trim() || todayInTaiwan();
  if (!origin || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("請提供有效的出發地與日期", 400);
  return getWeather(origin, date);
}

async function getWeather(city: string, requestedDate: string) {
  try {
    const [forecast] = await fetchCwaForecast(city);
    if (!forecast) return jsonError(`找不到出發地：${city}`, 422);

    const now = Date.now();
    const currentIndex = forecast.periods.findIndex((period) => {
      const start = Date.parse(period.startTime);
      const end = Date.parse(period.endTime);
      return Number.isFinite(start) && Number.isFinite(end) && now >= start && now < end;
    });
    const selectedPeriodIndex = currentIndex >= 0 ? currentIndex : 0;
    const current = forecast.periods[selectedPeriodIndex] ?? forecast.periods[0];
    const periods = forecast.periods.slice(0, 3).map((period) => ({
      label: period.startTime.slice(11, 16),
      summary: period.weather,
      weatherCode: 0,
      temperature: period.temperature ?? period.maxTemperature ?? 0,
      minTemperature: period.minTemperature,
      maxTemperature: period.maxTemperature,
      comfortIndex: period.comfortIndex,
      precipitationProbability: period.rainProbability ?? 0,
      windSpeed: period.windSpeed,
      startTime: period.startTime,
      endTime: period.endTime,
    }));
    const minValues = forecast.periods.map((period) => period.minTemperature).filter((value): value is number => value !== null);
    const maxValues = forecast.periods.map((period) => period.maxTemperature).filter((value): value is number => value !== null);
    const precipitationProbability = Math.max(...forecast.periods.map((period) => period.rainProbability ?? 0), 0);
    const rainy = precipitationProbability >= 40 || /雨|雷|颱風/.test(current?.weather ?? "");
    const hot = Math.max(...maxValues, 0) >= 32;
    const currentTime = taiwanNow();

    const response = NextResponse.json({
      source: "中央氣象署",
      sourceUrl: "https://opendata.cwa.gov.tw/dataset/forecast/F-C0032-001",
      sourceDataset: "一般天氣預報-今明36小時天氣預報",
      fetchedAt: forecast.fetchedAt,
      date: requestedDate,
      currentTime: `${currentTime.date} ${currentTime.weekday} ${currentTime.time}`,
      selectedPeriodIndex,
      location: { name: forecast.locationName, admin1: null },
      summary: current?.weather ?? "資料整理中",
      weatherCode: 0,
      periods,
      minTemperature: minValues.length ? Math.min(...minValues) : current?.temperature ?? 0,
      maxTemperature: maxValues.length ? Math.max(...maxValues) : current?.temperature ?? 0,
      comfortIndex: current?.comfortIndex ?? "資料整理中",
      precipitationProbability,
      precipitationMm: null,
      windSpeed: current?.windSpeed ?? 0,
      rainy,
      hot,
      recommendation: rainy ? "中央氣象署預報有降雨可能，建議攜帶雨具並準備室內備案。" : hot ? "午後可能偏熱，建議補充水分並安排遮蔭或室內休息點。" : "目前適合安排城市探索行程，出發前仍建議再次查看最新預報。",
    });
    response.headers.set("Cache-Control", `public, s-maxage=${CWA_CACHE_TTL_SECONDS}, stale-while-revalidate=60`);
    response.headers.set("X-Weather-Cache-TTL", `${CWA_CACHE_TTL_SECONDS}s`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "weather service error";
    if (message === "CWA_API_KEY is not configured") return jsonError("尚未設定中央氣象署 API key，請在 Vercel Environment Variables 設定 CWA_API_KEY", 503);
    console.error("[planner/weather] CWA request failed", { message });
    return jsonError("目前無法取得中央氣象署天氣資料，請稍後再試", 502);
  }
}

async function getAllWeather() {
  try {
    const forecasts = await fetchCwaForecast();
    const response = NextResponse.json({
      source: "中央氣象署",
      sourceUrl: "https://opendata.cwa.gov.tw/dataset/forecast/F-C0032-001",
      sourceDataset: "一般天氣預報-今明36小時天氣預報",
      fetchedAt: forecasts[0]?.fetchedAt ?? new Date().toISOString(),
      locations: forecasts.map((forecast) => ({
        locationName: forecast.locationName,
        periods: forecast.periods.slice(0, 3).map((period) => ({
          label: period.startTime.slice(11, 16),
          summary: period.weather,
          temperature: period.temperature ?? period.maxTemperature ?? 0,
          minTemperature: period.minTemperature,
          maxTemperature: period.maxTemperature,
          comfortIndex: period.comfortIndex,
          precipitationProbability: period.rainProbability ?? 0,
          windSpeed: period.windSpeed,
          startTime: period.startTime,
          endTime: period.endTime,
        })),
      })),
    });
    response.headers.set("Cache-Control", `public, s-maxage=${CWA_CACHE_TTL_SECONDS}, stale-while-revalidate=60`);
    response.headers.set("X-Weather-Cache-TTL", `${CWA_CACHE_TTL_SECONDS}s`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "weather service error";
    if (message === "CWA_API_KEY is not configured") return jsonError("尚未設定中央氣象署 API key，請在 Vercel Environment Variables 設定 CWA_API_KEY", 503);
    console.error("[planner/weather] CWA all-city request failed", { message });
    return jsonError("目前無法取得全台縣市天氣資料，請稍後再試", 502);
  }
}
