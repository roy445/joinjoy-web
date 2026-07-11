import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserFromSession, SESSION_COOKIE } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ user: null });

    const user = await getUserFromSession(token);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ message: "目前無法取得登入狀態" }, { status: 500 });
  }
}
