import { NextRequest, NextResponse } from "next/server";

type PlannerRouteRequest = {
  origin?: string;
  destinations?: string[];
  mode?: string;
};

type GeoapifyFeature = {
  properties?: {
    lat?: number;
    lon?: number;
    formatted?: string;
    distance?: number;
    time?: number;
  };
};

const MODE_MAP: Record<string, string> = {
  大眾運輸: "bus",
  自行開車: "drive",
  機車: "motorcycle",
  走路: "walk",
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function geocode(query: string, apiKey: string) {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", query);
  url.searchParams.set("filter", "countrycode:tw");
  url.searchParams.set("limit", "1");
  url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) throw new Error(`地點搜尋失敗（${response.status}）`);
  const data = (await response.json()) as { features?: GeoapifyFeature[] };
  const feature = data.features?.[0];
  const properties = feature?.properties;
  if (!properties?.lat || !properties.lon) return null;
  return {
    lat: properties.lat,
    lon: properties.lon,
    formatted: properties.formatted ?? query,
  };
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) return jsonError("尚未設定 Geoapify API key", 503);

    const body = (await request.json().catch(() => null)) as PlannerRouteRequest | null;
    const origin = body?.origin?.trim();
    const destinations = body?.destinations?.filter((value) => typeof value === "string" && value.trim()).slice(0, 8);
    if (!origin || !destinations?.length) return jsonError("請提供出發地與至少一個目的地", 400);

    const locations = await Promise.all([origin, ...destinations].map((query) => geocode(query, apiKey)));
    const missingIndex = locations.findIndex((location) => !location);
    if (missingIndex !== -1) {
      return jsonError(`找不到路線中的地點：${[origin, ...destinations][missingIndex]}`, 422);
    }

    const waypoints = locations.map((location) => `${location!.lat},${location!.lon}`).join("|");
    const routeUrl = new URL("https://api.geoapify.com/v1/routing");
    routeUrl.searchParams.set("waypoints", waypoints);
    routeUrl.searchParams.set("mode", MODE_MAP[body?.mode ?? ""] ?? "drive");
    routeUrl.searchParams.set("format", "json");
    routeUrl.searchParams.set("apiKey", apiKey);

    const routeResponse = await fetch(routeUrl, { next: { revalidate: 300 } });
    if (!routeResponse.ok) throw new Error(`路線計算失敗（${routeResponse.status}）`);
    const routeData = (await routeResponse.json()) as {
      features?: Array<{ properties?: { distance?: number; time?: number } }>;
    };
    const route = routeData.features?.[0]?.properties;
    if (typeof route?.distance !== "number" || typeof route.time !== "number") {
      return jsonError("Geoapify 沒有回傳可用的路線資料", 502);
    }

    return NextResponse.json({
      distanceKm: Math.round((route.distance / 1000) * 10) / 10,
      durationMinutes: Math.max(1, Math.round(route.time / 60)),
      mode: MODE_MAP[body?.mode ?? ""] ?? "drive",
      waypoints: locations.map((location) => location!.formatted),
    });
  } catch (error) {
    console.error("[planner/route]", error);
    return jsonError("目前無法取得路線，請稍後再試", 502);
  }
}
