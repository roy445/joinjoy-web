import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession, getSessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions(0),
    expires: new Date(0),
  });
  return response;
}
