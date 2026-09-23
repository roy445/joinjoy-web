"use client";

const VISITOR_KEY = "joinjoy_analytics_visitor";
const SESSION_KEY = "joinjoy_analytics_session";
const SESSION_TTL = 30 * 60 * 1000;

type AnalyticsValue = string | number | boolean | null;
export type TrackEvent = { name: string; category?: string; pagePath?: string; metadata?: Record<string, AnalyticsValue> };

function randomId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function getOrCreate(key: string) { try { const existing = window.localStorage.getItem(key); if (existing) return existing; const id = randomId(); window.localStorage.setItem(key, id); return id; } catch { return randomId(); } }
function getSessionId() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (raw) { const parsed = JSON.parse(raw) as { id?: string; at?: number }; if (parsed.id && parsed.at && Date.now() - parsed.at < SESSION_TTL) { window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, at: Date.now() })); return parsed.id; } }
    const id = randomId(); window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id, at: Date.now() })); return id;
  } catch { return randomId(); }
}
function deviceType() { const width = window.innerWidth; return width < 768 ? "mobile" : width < 1200 ? "tablet" : "desktop"; }
function browser() { const ua = navigator.userAgent; return /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other"; }
function os() { const ua = navigator.userAgent; return /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other"; }

let queue: Array<TrackEvent & { anonymousVisitorId: string; sessionId: string }> = [];
let timer: number | undefined;
export function track(event: TrackEvent) {
  if (typeof window === "undefined" || !event.name) return;
  queue.push({ ...event, anonymousVisitorId: getOrCreate(VISITOR_KEY), sessionId: getSessionId() });
  if (queue.length >= 8) { void flush(); return; }
  if (!timer) timer = window.setTimeout(() => { timer = undefined; void flush(); }, 4000);
}
export async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, 20);
  try {
    await fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch.map((event) => ({ ...event, deviceType: deviceType(), browser: browser(), os: os(), screenWidth: window.innerWidth, screenHeight: window.innerHeight })), context: { referrer: document.referrer || null, pagePath: window.location.pathname, utm: Object.fromEntries(new URLSearchParams(window.location.search).entries()) } }), keepalive: true });
  } catch { queue.unshift(...batch); }
}
export function trackPageView(path = window.location.pathname) { track({ name: "page_view", category: "navigation", pagePath: path }); }
export function trackClick(name: string, metadata?: Record<string, AnalyticsValue>) { track({ name, category: "feature", metadata }); }
