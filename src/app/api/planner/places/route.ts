import { NextRequest, NextResponse } from "next/server";

type PlaceRequest = {
  origin?: string;
  stops?: Array<{ query?: string; category?: string }>;
};

type Place = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  placeId: string | null;
  distanceMeters: number | null;
  source: string;
};

type FoursquareLocation = {
  address?: string;
  locality?: string;
  postcode?: string;
  country?: string;
  formatted_address?: string;
  latitude?: number;
  longitude?: number;
};

type FoursquareCategory = {
  fsq_category_id?: string;
  name?: string;
  short_name?: string;
};

type FoursquareResult = {
  fsq_place_id?: string;
  name?: string;
  location?: FoursquareLocation;
  categories?: FoursquareCategory[];
};

type FoursquareSearchResponse = {
  results?: FoursquareResult[];
};

type GeoapifyFeature = {
  properties?: {
    lat?: number;
    lon?: number;
  };
};

type FoursquareCategoryMap = Record<string, { ids: string[]; query: string }>;

const CATEGORY_MAP: FoursquareCategoryMap = {
  "catering.restaurant": { ids: ["4bf58dd8d48988d145941735"], query: "餐廳" },
  "catering.cafe": { ids: ["4bf58dd8d48988d16d941735"], query: "咖啡廳" },
  "entertainment.cinema": { ids: ["4bf58dd8d48988d17f941735"], query: "cinema" },
  "tourism": { ids: ["4bf58dd8d48988d12d941735"], query: "景點" },
  activity: { ids: ["4bf58dd8d48988d1e3931735"], query: "玩樂" },
};

const DEFAULT_CATEGORY: { ids: string[]; query: string } = { ids: ["4bf58dd8d48988d145941735"], query: "餐廳" };

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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function buildAddress(location: FoursquareLocation | undefined) {
  if (!location) return "";
  return [location.formatted_address, location.address].filter(Boolean)[0] || "";
}

async function geocodeOrigin(origin: string) {
  const searchName = TAIWAN_CITY_ALIASES[origin] || origin;
  const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geocodeUrl.searchParams.set("name", searchName);
  geocodeUrl.searchParams.set("count", "1");
  geocodeUrl.searchParams.set("language", "en");
  geocodeUrl.searchParams.set("countryCode", "TW");
  const geocodeResponse = await fetch(geocodeUrl, { next: { revalidate: 3600 } });
  if (geocodeResponse.ok) {
    const geocodeData = (await geocodeResponse.json()) as {
      results?: Array<{ latitude?: number; longitude?: number }>;
    };
    const first = geocodeData.results?.[0];
    if (typeof first?.latitude === "number" && typeof first.longitude === "number") {
      return { lat: first.latitude, lon: first.longitude };
    }
  }

  if (process.env.GEOAPIFY_API_KEY) {
    const geoapifyUrl = new URL("https://api.geoapify.com/v1/geocode/search");
    geoapifyUrl.searchParams.set("text", origin);
    geoapifyUrl.searchParams.set("filter", "countrycode:tw");
    geoapifyUrl.searchParams.set("limit", "1");
    geoapifyUrl.searchParams.set("format", "json");
    geoapifyUrl.searchParams.set("apiKey", process.env.GEOAPIFY_API_KEY);
    const geoapifyResponse = await fetch(geoapifyUrl, { next: { revalidate: 3600 } });
    if (geoapifyResponse.ok) {
      const geoapifyData = (await geoapifyResponse.json()) as { results?: GeoapifyFeature[] };
      const properties = geoapifyData.results?.[0]?.properties;
      if (typeof properties?.lat === "number" && typeof properties.lon === "number") {
        return { lat: properties.lat, lon: properties.lon };
      }
    }
  }
  return null;
}

async function searchPlace(
  origin: { lat: number; lon: number },
  stop: { query?: string; category?: string },
  apiKey: string,
): Promise<Place | null> {
  const category = CATEGORY_MAP[stop.category?.trim() || ""] || DEFAULT_CATEGORY;
  const url = new URL("https://places-api.foursquare.com/places/search");
  url.searchParams.set("ll", `${origin.lat},${origin.lon}`);
  url.searchParams.set("radius", "12000");
  url.searchParams.set("limit", "1");
  url.searchParams.set("fields", "fsq_place_id,name,location,categories");
  url.searchParams.set("fsq_category_ids", category.ids.join(","));
  if (stop.query?.trim()) url.searchParams.set("query", stop.query.trim());
  else url.searchParams.set("query", category.query);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Places-Api-Version": "2025-06-17",
    },
    next: { revalidate: 900 },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as FoursquareSearchResponse;
  const result = data.results?.[0];
  if (!result) return null;
  const latitude = result.location?.latitude;
  const longitude = result.location?.longitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return {
    name: result.name || stop.query || "附近地點",
    address: buildAddress(result.location),
    lat: latitude,
    lon: longitude,
    placeId: result.fsq_place_id || null,
    distanceMeters: null,
    source: "foursquare",
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) return jsonError("尚未設定 Foursquare API key", 503);
    const body = (await request.json().catch(() => null)) as PlaceRequest | null;
    const origin = body?.origin?.trim();
    const stops = body?.stops?.filter((stop) => stop && (stop.query?.trim() || stop.category?.trim())).slice(0, 5);
    if (!origin || !stops?.length) return jsonError("請提供出發地與至少一個活動站點", 400);

    const originPoint = await geocodeOrigin(origin);
    if (!originPoint) return jsonError(`找不到出發地：${origin}`, 422);
    const places = await Promise.all(stops.map((stop) => searchPlace(originPoint, stop, apiKey)));
    return NextResponse.json({ origin: originPoint, places });
  } catch (error) {
    console.error("[planner/places]", error);
    return jsonError("目前無法搜尋附近地點，請稍後再試", 502);
  }
}
