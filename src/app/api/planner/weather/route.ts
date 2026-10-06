import { NextRequest, NextResponse } from "next/server";
import { CWA_CACHE_TTL_SECONDS, fetchCwaForecast, fetchCwaTownshipForecast, taiwanNow } from "@/lib/cwa-weather";

type WeatherRequest = { origin?: string; date?: string };

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function cwaErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message === "CWA_API_TIMEOUT") return NextResponse.json({ error: "中央氣象署目前回應較慢，請稍後再試。", code: "CWA_TIMEOUT", degraded: true }, { status: 504 });
  if (message === "CWA_API_UNAVAILABLE") return NextResponse.json({ error: "中央氣象署服務暫時無法連線，請稍後重試。", code: "CWA_UNAVAILABLE", degraded: true }, { status: 503 });
  if (message === "CWA_API_INVALID_RESPONSE") return NextResponse.json({ error: "中央氣象署回傳資料格式暫時異常，請稍後再試。", code: "CWA_INVALID_RESPONSE", degraded: true }, { status: 502 });
  return jsonError(fallback, 502);
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
  if (request.nextUrl.searchParams.get("townships") === "1") {
    if (!city) return jsonError("請提供縣市名稱以取得鄉鎮市區", 400);
    return getTownships(city);
  }
  if (!city) return jsonError("請提供縣市名稱，例如：台北市", 400);
  const township = request.nextUrl.searchParams.get("township")?.trim();
  if (township) return getTownshipWeather(city, township);
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
    if (!forecast.periods.some((period) => period.temperature !== null || period.weather !== "資料整理中")) throw new Error("CWA_API_INVALID_RESPONSE");

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
    return cwaErrorResponse(error, "目前無法取得中央氣象署天氣資料，請稍後再試");
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
    return cwaErrorResponse(error, "目前無法取得全台縣市天氣資料，請稍後再試");
  }
}

async function getTownships(city: string) {
  try {
    const forecasts = await fetchCwaTownshipForecast(city);
    const response = NextResponse.json({ source: "中央氣象署", locations: forecasts.map((forecast) => forecast.locationName).sort((a, b) => a.localeCompare(b, "zh-Hant")) });
    response.headers.set("Cache-Control", `public, s-maxage=${CWA_CACHE_TTL_SECONDS}, stale-while-revalidate=60`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "weather service error";
    if (message === "CWA_API_KEY is not configured") return jsonError("尚未設定中央氣象署 API key，請在 Vercel Environment Variables 設定 CWA_API_KEY", 503);
    console.error("[planner/weather] CWA township list request failed", { message });
    return cwaErrorResponse(error, "目前無法取得鄉鎮市區清單，請稍後再試");
  }
}

async function getTownshipWeather(city: string, township: string) {
  try {
    const forecasts = await fetchCwaTownshipForecast(city);
    const forecast = forecasts.find((item) => item.locationName === township || item.locationName.includes(township));
    if (!forecast) return jsonError(`找不到鄉鎮市區：${township}`, 404);
    if (!forecast.periods.some((period) => period.temperature !== null || period.weather !== "資料整理中")) throw new Error("CWA_API_INVALID_RESPONSE");
    const periods = forecast.periods.slice(0, 16).map((period) => ({
      label: period.startTime.slice(11, 16), summary: period.weather, weatherCode: 0,
      temperature: period.temperature ?? period.maxTemperature ?? 0, minTemperature: period.minTemperature,
      maxTemperature: period.maxTemperature, comfortIndex: period.comfortIndex,
      precipitationProbability: period.rainProbability ?? 0, windSpeed: period.windSpeed,
      startTime: period.startTime, endTime: period.endTime,
    }));
    const current = periods[0];
    const response = NextResponse.json({
      source: "中央氣象署", sourceUrl: "https://opendata.cwa.gov.tw/dataset/forecast/F-D0047-093",
      sourceDataset: "鄉鎮天氣預報-全臺灣各鄉鎮市區預報資料", fetchedAt: forecast.fetchedAt,
      date: todayInTaiwan(), currentTime: `${taiwanNow().date} ${taiwanNow().weekday} ${taiwanNow().time}`,
      selectedPeriodIndex: 0, location: { name: `${city} ${forecast.locationName}`, admin1: city },
      summary: current?.summary ?? "資料整理中", weatherCode: 0, periods,
      minTemperature: current?.minTemperature ?? current?.temperature ?? 0, maxTemperature: current?.maxTemperature ?? current?.temperature ?? 0,
      comfortIndex: current?.comfortIndex ?? "資料整理中", precipitationProbability: current?.precipitationProbability ?? 0,
      precipitationMm: null, windSpeed: current?.windSpeed ?? 0, rainy: (current?.precipitationProbability ?? 0) >= 40,
      hot: (current?.temperature ?? 0) >= 32, recommendation: (current?.precipitationProbability ?? 0) >= 40 ? "鄉鎮預報有降雨可能，建議攜帶雨具。" : "出發前仍建議再次查看最新鄉鎮預報。",
    });
    response.headers.set("Cache-Control", `public, s-maxage=${CWA_CACHE_TTL_SECONDS}, stale-while-revalidate=60`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "weather service error";
    if (message === "CWA_API_KEY is not configured") return jsonError("尚未設定中央氣象署 API key，請在 Vercel Environment Variables 設定 CWA_API_KEY", 503);
    console.error("[planner/weather] CWA township request failed", { message });
    return cwaErrorResponse(error, "目前無法取得鄉鎮市區天氣資料，請稍後再試");
  }
}
