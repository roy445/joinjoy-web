import { NextResponse } from "next/server";
import { ensureSeeded } from "@/lib/seed";

export async function POST() {
  const result = await ensureSeeded();
  return NextResponse.json(result);
}
