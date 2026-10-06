const CWA_FORECAST_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001";
export const CWA_CACHE_TTL_SECONDS = 10 * 60;
const TAIPEI_TIME_ZONE = "Asia/Taipei";

export const TAIWAN_CITIES = [
  "基隆市", "臺北市", "新北市", "桃園市", "新竹市", "新竹縣", "苗栗縣",
  "臺中市", "彰化縣", "南投縣", "雲林縣", "嘉義市", "嘉義縣", "臺南市",
  "高雄市", "屏東縣", "宜蘭縣", "花蓮縣", "臺東縣", "澎湖縣", "金門縣", "連江縣",
] as const;

const CITY_ALIASES: Record<string, string> = {
  台北: "臺北市", 臺北: "臺北市", 台北市: "臺北市", 臺北市: "臺北市",
  新北: "新北市", 新北市: "新北市", 桃園: "桃園市", 桃園市: "桃園市",
  新竹: "新竹市", 新竹市: "新竹市", 新竹縣: "新竹縣", 苗栗: "苗栗縣", 苗栗縣: "苗栗縣",
  台中: "臺中市", 臺中: "臺中市", 台中市: "臺中市", 臺中市: "臺中市",
  彰化: "彰化縣", 彰化縣: "彰化縣", 南投: "南投縣", 南投縣: "南投縣",
  雲林: "雲林縣", 雲林縣: "雲林縣", 嘉義: "嘉義市", 嘉義市: "嘉義市", 嘉義縣: "嘉義縣",
  台南: "臺南市", 臺南: "臺南市", 台南市: "臺南市", 臺南市: "臺南市",
  高雄: "高雄市", 高雄市: "高雄市", 屏東: "屏東縣", 屏東縣: "屏東縣",
  宜蘭: "宜蘭縣", 宜蘭縣: "宜蘭縣", 花蓮: "花蓮縣", 花蓮縣: "花蓮縣",
  台東: "臺東縣", 臺東: "臺東縣", 台東縣: "臺東縣", 臺東縣: "臺東縣",
  澎湖: "澎湖縣", 澎湖縣: "澎湖縣", 金門: "金門縣", 金門縣: "金門縣",
  馬祖: "連江縣", 連江: "連江縣", 連江縣: "連江縣", 基隆: "基隆市", 基隆市: "基隆市",
};

type CwaParameter = { parameterName?: string; parameterValue?: string };
type CwaTime = { startTime: string; endTime: string; parameter?: CwaParameter };
type CwaWeatherElement = { elementName: string; time?: CwaTime[] };
type CwaLocation = { locationName: string; weatherElement?: CwaWeatherElement[] };
type CwaResponse = { success?: string; records?: { location?: CwaLocation[] } };

export type CwaForecastPeriod = {
  startTime: string;
  endTime: string;
  weather: string;
  temperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  rainProbability: number | null;
  windSpeed: number | null;
};

export type CwaForecast = {
  source: "中央氣象署";
  fetchedAt: string;
  locationName: string;
  periods: CwaForecastPeriod[];
};

export function normalizeTaiwanCity(input: string): string | null {
  const text = input.trim();
  if (CITY_ALIASES[text]) return CITY_ALIASES[text];
  return TAIWAN_CITIES.find((city) => text.includes(city)) ?? null;
}

export function findTaiwanCityInText(input: string): string | null {
  const direct = Object.keys(CITY_ALIASES).sort((a, b) => b.length - a.length).find((alias) => input.includes(alias));
  return direct ? CITY_ALIASES[direct] : null;
}

export function taiwanNow(): { iso: string; date: string; time: string; weekday: string } {
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
  });
  const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(dateFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    iso: now.toISOString(),
    date: `${parts.year}年${parts.month}月${parts.day}日`,
    time: timeFormatter.format(now),
    weekday: parts.weekday || "",
  };
}

function numberParameter(elements: Map<string, CwaWeatherElement>, name: string, index: number): number | null {
  const raw = elements.get(name)?.time?.[index]?.parameter?.parameterName;
  const value = raw === undefined ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function textParameter(elements: Map<string, CwaWeatherElement>, name: string, index: number): string {
  return elements.get(name)?.time?.[index]?.parameter?.parameterName?.trim() || "資料整理中";
}

export async function fetchCwaForecast(city?: string): Promise<CwaForecast[]> {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) throw new Error("CWA_API_KEY is not configured");

  const url = new URL(CWA_FORECAST_URL);
  url.searchParams.set("Authorization", apiKey);
  url.searchParams.set("format", "JSON");
  const normalizedCity = city ? normalizeTaiwanCity(city) : null;
  if (city && !normalizedCity) throw new Error(`找不到台灣縣市：${city}`);
  if (normalizedCity) url.searchParams.set("locationName", normalizedCity);

  // Use Next.js Data Cache rather than a process-global Map: it is shared by
  // Vercel Serverless instances when backed by the deployment Data Cache.
  // The URL contains the normalized city, so each city/all-cities query has
  // its own cache entry while repeated requests within the TTL avoid CWA calls.
  const response = await fetch(url, {
    cache: "force-cache",
    next: { revalidate: CWA_CACHE_TTL_SECONDS, tags: ["cwa-weather"] },
  });
  if (!response.ok) throw new Error(`中央氣象署 API 回應 ${response.status}`);
  const payload = (await response.json()) as CwaResponse;
  const locations = payload.records?.location ?? [];
  if (!locations.length) throw new Error("中央氣象署沒有回傳縣市預報");

  return locations.map((location) => {
    const elements = new Map((location.weatherElement ?? []).map((element) => [element.elementName, element]));
    const timeCount = Math.max(...(location.weatherElement ?? []).map((element) => element.time?.length ?? 0), 0);
    const periods = Array.from({ length: timeCount }, (_, index) => {
      const anchor = location.weatherElement?.find((element) => element.time?.[index])?.time?.[index];
      return {
        startTime: anchor?.startTime ?? "",
        endTime: anchor?.endTime ?? "",
        weather: textParameter(elements, "Wx", index),
        temperature: numberParameter(elements, "T", index),
        minTemperature: numberParameter(elements, "MinT", index),
        maxTemperature: numberParameter(elements, "MaxT", index),
        rainProbability: numberParameter(elements, "PoP", index),
        windSpeed: numberParameter(elements, "WS", index),
      };
    });
    return { source: "中央氣象署" as const, fetchedAt: new Date().toISOString(), locationName: location.locationName, periods };
  });
}

export function formatForecastForAi(forecasts: CwaForecast[]): string {
  return forecasts.map((forecast) => {
    const current = forecast.periods[0];
    if (!current) return `${forecast.locationName}：目前沒有可用預報`;
    return `${forecast.locationName}：${current.weather}，${current.minTemperature ?? "-"}–${current.maxTemperature ?? "-"}°C，降雨機率 ${current.rainProbability ?? "-"}%（${current.startTime} 至 ${current.endTime}）`;
  }).join("；");
}
