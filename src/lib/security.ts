import { NextRequest } from "next/server";

// Very lightweight in-memory rate limiter (per server instance).
// Prevents spam posting of comments / chat / registration / login brute force.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientKey(req: Request | NextRequest, suffix: string) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return `${ip}:${suffix}`;
}

// Basic same-origin check to mitigate CSRF for state-changing requests.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from server / curl without origin header are allowed
  const host = req.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    return !host || originHost === host;
  } catch {
    return false;
  }
}

// Simple XSS-safe text sanitizer (strip tags & scripts, escape special chars for storage safety)
export function sanitize(input: string, max = 5000): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, max);
}

const SPAM_PATTERNS = [/https?:\/\/[^\s]{0,3}(bit\.ly|t\.me\/joinchat)/i, /(.)\1{9,}/];

export function looksLikeSpam(text: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(text));
}
export function generateInviteCode(prefix = "GRP"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}
