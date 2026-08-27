import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export const SESSION_COOKIE = "joinjoy_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const check = crypto.scryptSync(password, salt, 64).toString("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  canCreateEvent: boolean;
  creditScore: string;
  isBlacklisted: boolean;
  jCoins: number;
  aiTitles: string[] | null;
  activeTitle: string | null;
  activeBadge: string | null;
  activeAvatarFrame: string | null;
};

export async function createSession(userId: number) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ userId, token, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    // First, check if the session exists
    const sessionRows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (sessionRows.length === 0) return null;
    const userId = sessionRows[0].userId;

    // Then, fetch user with error handling for potentially missing columns
    try {
      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          role: users.role,
          status: users.status,
          canCreateEvent: users.canCreateEvent,
          creditScore: users.creditScore,
          isBlacklisted: users.isBlacklisted,
          // Temporary remove columns that might not exist yet to prevent crash
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (!rows[0]) return null;
      
      // Manually add defaults for columns we removed above to maintain type compatibility
      return {
        ...rows[0],
        jCoins: 0,
        aiTitles: [],
        activeTitle: null,
        activeBadge: null,
        activeAvatarFrame: null,
      } as SessionUser;
    } catch (dbError) {
      console.error("Database schema mismatch, falling back to basic user info:", dbError);
      // Fallback: only select columns that are guaranteed to exist in older versions
      const basicRows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          role: users.role,
          status: users.status,
          canCreateEvent: users.canCreateEvent,
          creditScore: users.creditScore,
          isBlacklisted: users.isBlacklisted,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (basicRows.length === 0) return null;
      
      // Map basic user to SessionUser with defaults for new fields
      return {
        ...basicRows[0],
        jCoins: 0,
        aiTitles: [],
        activeTitle: null,
        activeBadge: null,
        activeAvatarFrame: null,
      } as SessionUser;
    }
  } catch (error) {
    console.error("Critical Auth Error:", error);
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("請先登入");
  }
  if (user.status === "suspended") {
    throw new AuthError("您的帳號已被停權");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError("需要管理員權限");
  }
  return user;
}

export class AuthError extends Error {}
