const CWA_FORECAST_URL = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001";
const CWA_TOWNSHIP_URL_PREFIX = "https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-D0047-";
export const CWA_CACHE_TTL_SECONDS = 10 * 60;
const TAIPEI_TIME_ZONE = "Asia/Taipei";
type JsonRecord = Record<string, unknown>;

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

const TOWNSHIP_DATASET_BY_CITY: Record<string, string> = {
  宜蘭縣: "001", 桃園市: "005", 新竹縣: "009", 苗栗縣: "013", 彰化縣: "017", 南投縣: "021", 雲林縣: "025",
  嘉義縣: "029", 屏東縣: "033", 臺東縣: "037", 花蓮縣: "041", 澎湖縣: "045", 基隆市: "049", 新竹市: "053",
  嘉義市: "057", 臺北市: "061", 高雄市: "065", 新北市: "069", 臺中市: "073", 臺南市: "077", 連江縣: "081", 金門縣: "085",
};

export type CwaForecastPeriod = {
  startTime: string;
  endTime: string;
  weather: string;
  temperature: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  comfortIndex: string;
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
  const dateFormatter = new Intl.DateTimeFormat("zh-TW", { timeZone: TAIPEI_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" });
  const timeFormatter = new Intl.DateTimeFormat("zh-TW", { timeZone: TAIPEI_TIME_ZONE, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const parts = Object.fromEntries(dateFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  return { iso: now.toISOString(), date: `${parts.year}年${parts.month}月${parts.day}日`, time: timeFormatter.format(now), weekday: parts.weekday || "" };
}

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? value as JsonRecord : {};
}

function valueOf(source: JsonRecord, names: string[]): unknown {
  for (const name of names) if (source[name] !== undefined && source[name] !== null) return source[name];
  return undefined;
}

function recordsOf(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.map(record);
  return value === undefined ? [] : [record(value)];
}

function numberValue(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parameterText(element: JsonRecord, index: number): string {
  const times = recordsOf(valueOf(element, ["time", "Time"]));
  const time = times[index] ?? {};
  const parameter = record(valueOf(time, ["parameter", "Parameter", "elementValue", "ElementValue"]));
  const value = valueOf(parameter, ["parameterName", "ParameterName", "Temperature", "MaxTemperature", "MinTemperature", "ComfortIndexDescription", "ComfortIndex", "ProbabilityOfPrecipitation", "WeatherDescription", "Weather", "WindSpeed"]);
  return value === undefined || value === null || String(value).trim() === "" ? "資料整理中" : String(value).trim();
}

function parameterNumber(element: JsonRecord, index: number): number | null {
  const text = parameterText(element, index);
  return text === "資料整理中" ? null : numberValue(text);
}

function elementByName(elements: JsonRecord[], names: string[]): JsonRecord {
  const wanted = names.map((name) => name.toLowerCase());
  return elements.find((element) => wanted.includes(String(valueOf(element, ["elementName", "ElementName"])).toLowerCase())) ?? {};
}

function parseLocation(location: JsonRecord, fetchedAt: string): CwaForecast {
  const rawElements = recordsOf(valueOf(location, ["weatherElement", "WeatherElement"]));
  const weather = elementByName(rawElements, ["wx", "weather", "weatherdescription"]);
  const temperature = elementByName(rawElements, ["t", "temperature"]);
  const minTemperature = elementByName(rawElements, ["mint", "mintemperature"]);
  const maxTemperature = elementByName(rawElements, ["maxt", "maxtemperature"]);
  const comfort = elementByName(rawElements, ["ci", "comfortindex", "comfortindexdescription"]);
  const rain = elementByName(rawElements, ["pop", "pop6h", "probabilityofprecipitation"]);
  const wind = elementByName(rawElements, ["ws", "windspeed"]);
  const timeCount = Math.max(...rawElements.map((element) => recordsOf(valueOf(element, ["time", "Time"])).length), 0);
  const anchorElement = rawElements[0] ?? {};
  const periods = Array.from({ length: timeCount }, (_, index) => {
    const time = recordsOf(valueOf(anchorElement, ["time", "Time"]))[index];
    return {
      startTime: String(valueOf(time, ["startTime", "StartTime", "dataTime", "DataTime"]) ?? ""),
      endTime: String(valueOf(time, ["endTime", "EndTime"]) ?? ""),
      weather: parameterText(weather, index), temperature: parameterNumber(temperature, index),
      minTemperature: parameterNumber(minTemperature, index), maxTemperature: parameterNumber(maxTemperature, index),
      comfortIndex: parameterText(comfort, index), rainProbability: parameterNumber(rain, index), windSpeed: parameterNumber(wind, index),
    };
  });
  return { source: "中央氣象署", fetchedAt, locationName: String(valueOf(location, ["locationName", "LocationName"]) ?? "未命名地區"), periods };
}

function parseForecastLocations(payload: JsonRecord): CwaForecast[] {
  const records = record(valueOf(payload, ["records", "Records"]));
  const directLocations = recordsOf(valueOf(records, ["location", "Location"]));
  const groups = recordsOf(valueOf(records, ["locations", "Locations"]));
  const nestedLocations = groups.flatMap((group) => recordsOf(valueOf(group, ["location", "Location"])));
  const locations = [...directLocations, ...nestedLocations];
  if (!locations.length) throw new Error("中央氣象署沒有回傳鄉鎮或縣市資料");
  const fetchedAt = new Date().toISOString();
  return locations.map((location) => parseLocation(location, fetchedAt));
}

async function fetchCwaJson(url: URL, tag: string): Promise<CwaForecast[]> {
  const response = await fetch(url, { cache: "force-cache", next: { revalidate: CWA_CACHE_TTL_SECONDS, tags: [tag] } });
  if (!response.ok) throw new Error(`中央氣象署 API 回應 ${response.status}`);
  return parseForecastLocations(await response.json() as JsonRecord);
}

export async function fetchCwaForecast(city?: string): Promise<CwaForecast[]> {
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) throw new Error("CWA_API_KEY is not configured");
  const url = new URL(CWA_FORECAST_URL);
  url.searchParams.set("Authorization", apiKey); url.searchParams.set("format", "JSON");
  const normalizedCity = city ? normalizeTaiwanCity(city) : null;
  if (city && !normalizedCity) throw new Error(`找不到台灣縣市：${city}`);
  if (normalizedCity) url.searchParams.set("locationName", normalizedCity);
  return fetchCwaJson(url, "cwa-weather");
}

export async function fetchCwaTownshipForecast(city: string): Promise<CwaForecast[]> {
  const normalizedCity = normalizeTaiwanCity(city);
  const datasetId = normalizedCity ? TOWNSHIP_DATASET_BY_CITY[normalizedCity] : null;
  if (!normalizedCity || !datasetId) throw new Error(`找不到鄉鎮預報資料集：${city}`);
  const apiKey = process.env.CWA_API_KEY;
  if (!apiKey) throw new Error("CWA_API_KEY is not configured");
  const url = new URL(`${CWA_TOWNSHIP_URL_PREFIX}${datasetId}`);
  url.searchParams.set("Authorization", apiKey); url.searchParams.set("format", "JSON");
  return fetchCwaJson(url, `cwa-township-${normalizedCity}`);
}

export function formatForecastForAi(forecasts: CwaForecast[]): string {
  return forecasts.map((forecast) => {
    const current = forecast.periods[0];
    if (!current) return `${forecast.locationName}：目前沒有可用預報`;
    return `${forecast.locationName}：${current.weather}，最高 ${current.maxTemperature ?? "-"}°C、最低 ${current.minTemperature ?? "-"}°C，${current.comfortIndex}，降雨機率 ${current.rainProbability ?? "-"}%（${current.startTime} 至 ${current.endTime}）`;
  }).join("；");
}
