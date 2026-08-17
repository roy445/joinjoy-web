import { NextRequest, NextResponse } from "next/server";

type PlaceRequest = {
  origin?: string;
  stops?: Array<{ query?: string; category?: string }>;
};

type GeoapifyFeature = {
  properties?: {
    name?: string;
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    lat?: number;
    lon?: number;
    place_id?: string;
    categories?: string[];
    distance?: number;
  };
};

const DEFAULT_CATEGORY = "catering";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function geocodeOrigin(origin: string, apiKey: string) {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", origin);
  url.searchParams.set("filter", "countrycode:tw");
  url.searchParams.set("limit", "1");
  url.searchParams.set("format", "json");
  url.searchParams.set("apiKey", apiKey);
  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`出發地定位失敗（${response.status}）`);
  const data = (await response.json()) as { results?: GeoapifyFeature[] };
  const properties = data.results?.[0]?.properties;
  if (typeof properties?.lat !== "number" || typeof properties.lon !== "number") return null;
  return { lat: properties.lat, lon: properties.lon };
}

async function searchPlace(
  origin: { lat: number; lon: number },
  stop: { query?: string; category?: string },
  apiKey: string,
) {
  const url = new URL("https://api.geoapify.com/v2/places");
  url.searchParams.set("categories", stop.category?.trim() || DEFAULT_CATEGORY);
  url.searchParams.set("bias", `proximity:${origin.lon},${origin.lat}`);
  url.searchParams.set("filter", `circle:${origin.lon},${origin.lat},15000`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("lang", "zh");
  url.searchParams.set("apiKey", apiKey);
  if (stop.query?.trim()) url.searchParams.set("name", stop.query.trim());

  const response = await fetch(url, { next: { revalidate: 900 } });
  if (!response.ok) return null;
  const data = (await response.json()) as { features?: GeoapifyFeature[] };
  const properties = data.features?.[0]?.properties;
  if (typeof properties?.lat !== "number" || typeof properties.lon !== "number") return null;
  return {
    name: properties.name || properties.address_line1 || stop.query || "附近地點",
    address: properties.formatted || [properties.address_line1, properties.address_line2].filter(Boolean).join(", "),
    lat: properties.lat,
    lon: properties.lon,
    placeId: properties.place_id || null,
    categories: properties.categories || [],
    distanceMeters: typeof properties.distance === "number" ? Math.round(properties.distance) : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) return jsonError("尚未設定 Geoapify API key", 503);
    const body = (await request.json().catch(() => null)) as PlaceRequest | null;
    const origin = body?.origin?.trim();
    const stops = body?.stops?.filter((stop) => stop && (stop.query?.trim() || stop.category?.trim())).slice(0, 5);
    if (!origin || !stops?.length) return jsonError("請提供出發地與至少一個活動站點", 400);

    const originPoint = await geocodeOrigin(origin, apiKey);
    if (!originPoint) return jsonError(`找不到出發地：${origin}`, 422);
    const places = await Promise.all(stops.map((stop) => searchPlace(originPoint, stop, apiKey)));
    return NextResponse.json({ origin: originPoint, places });
  } catch (error) {
    console.error("[planner/places]", error);
    return jsonError("目前無法搜尋附近地點，請稍後再試", 502);
  }
}
