import { NextRequest, NextResponse } from "next/server";

type WeatherRequest = {
  origin?: string;
  date?: string;
};

type GeocodingResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  country_code?: string;
  admin1?: string;
};

type ForecastResponse = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    precipitation_sum?: number[];
    wind_speed_10m_max?: number[];
  };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

const TAIWAN_CITY_ALIASES: Record<string, string> = {
  台北: "Taipei",
  臺北: "Taipei",
  新北: "New Taipei",
  桃園: "Taoyuan",
  台中: "Taichung",
  臺中: "Taichung",
  台南: "Tainan",
  臺南: "Tainan",
  高雄: "Kaohsiung",
  臺東: "Taitung",
  花蓮: "Hualien",
  彰化: "Changhua",
  嘉義: "Chiayi",
  宜蘭: "Yilan",
  屏東: "Pingtung",
};

function weatherDescription(code: number) {
  if (code === 0) return "晴朗";
  if ([1, 2, 3].includes(code)) return code === 1 ? "大致晴朗" : "多雲";
  if ([45, 48].includes(code)) return "有霧";
  if ([51, 53, 55, 56, 57].includes(code)) return "細雨";
  if ([61, 63, 65, 66, 67].includes(code)) return "下雨";
  if ([71, 73, 75, 77].includes(code)) return "降雪";
  if ([80, 81, 82].includes(code)) return "陣雨";
  if ([85, 86].includes(code)) return "陣雪";
  if ([95, 96, 99].includes(code)) return "雷雨";
  return "天氣變化";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as WeatherRequest | null;
    const origin = body?.origin?.trim();
    const date = body?.date?.trim();
    if (!origin || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return jsonError("請提供有效的出發地與日期", 400);
    }

    const searchName = TAIWAN_CITY_ALIASES[origin] || origin;
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.searchParams.set("name", searchName);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", "en");
    geocodeUrl.searchParams.set("countryCode", "TW");
    const geocodeResponse = await fetch(geocodeUrl, { next: { revalidate: 3600 } });
    if (!geocodeResponse.ok) return jsonError("出發地定位失敗", 502);
    const geocodeData = (await geocodeResponse.json()) as { results?: GeocodingResult[] };
    let location = geocodeData.results?.[0];

    if ((!location || typeof location.latitude !== "number" || typeof location.longitude !== "number") && process.env.GEOAPIFY_API_KEY) {
      const geoapifyUrl = new URL("https://api.geoapify.com/v1/geocode/search");
      geoapifyUrl.searchParams.set("text", origin);
      geoapifyUrl.searchParams.set("filter", "countrycode:tw");
      geoapifyUrl.searchParams.set("limit", "1");
      geoapifyUrl.searchParams.set("format", "json");
      geoapifyUrl.searchParams.set("apiKey", process.env.GEOAPIFY_API_KEY);
      const geoapifyResponse = await fetch(geoapifyUrl, { next: { revalidate: 3600 } });
      if (geoapifyResponse.ok) {
        const geoapifyData = (await geoapifyResponse.json()) as { results?: Array<{ name?: string; city?: string; state?: string; lat?: number; lon?: number }> };
        const geoapifyLocation = geoapifyData.results?.[0];
        if (typeof geoapifyLocation?.lat === "number" && typeof geoapifyLocation.lon === "number") {
          location = {
            name: geoapifyLocation.name || origin,
            admin1: geoapifyLocation.state || geoapifyLocation.city,
            latitude: geoapifyLocation.lat,
            longitude: geoapifyLocation.lon,
          };
        }
      }
    }

    if (typeof location?.latitude !== "number" || typeof location.longitude !== "number") {
      return jsonError(`找不到出發地：${origin}`, 422);
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", String(location.latitude));
    forecastUrl.searchParams.set("longitude", String(location.longitude));
    forecastUrl.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max");
    forecastUrl.searchParams.set("start_date", date);
    forecastUrl.searchParams.set("end_date", date);
    forecastUrl.searchParams.set("timezone", "Asia/Taipei");
    const forecastResponse = await fetch(forecastUrl, { next: { revalidate: 900 } });
    if (!forecastResponse.ok) return jsonError("目前沒有這個日期的天氣預報", 422);
    const forecast = (await forecastResponse.json()) as ForecastResponse;
    const daily = forecast.daily;
    const code = daily?.weather_code?.[0];
    if (typeof code !== "number") return jsonError("天氣服務沒有回傳有效資料", 502);

    const precipitationProbability = Math.round(daily?.precipitation_probability_max?.[0] ?? 0);
    const precipitationMm = Math.round((daily?.precipitation_sum?.[0] ?? 0) * 10) / 10;
    const maxTemperature = Math.round(daily?.temperature_2m_max?.[0] ?? 0);
    const minTemperature = Math.round(daily?.temperature_2m_min?.[0] ?? 0);
    const windSpeed = Math.round(daily?.wind_speed_10m_max?.[0] ?? 0);
    const rainy = precipitationProbability >= 40 || precipitationMm >= 1 || code >= 51;
    const hot = maxTemperature >= 32;

    return NextResponse.json({
      date,
      location: {
        name: location.name || origin,
        admin1: location.admin1 || null,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      summary: weatherDescription(code),
      weatherCode: code,
      minTemperature,
      maxTemperature,
      precipitationProbability,
      precipitationMm,
      windSpeed,
      rainy,
      hot,
      recommendation: rainy ? "建議優先選室內行程，並準備雨備交通。" : hot ? "午後偏熱，建議安排室內休息點並補充水分。" : "適合安排城市探索行程。",
    });
  } catch (error) {
    console.error("[planner/weather]", error);
    return jsonError("目前無法取得天氣，請稍後再試", 502);
  }
}
