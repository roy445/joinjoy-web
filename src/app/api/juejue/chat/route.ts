import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { JueJue } from "@/lib/juejue";
import { isSameOrigin, rateLimit } from "@/lib/security";

export async function POST(req: NextRequest) {
  // 1. Security Checks
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入以使用 JueJue" }, { status: 401 });
    }

    // 2. Rate Limiting (30 requests per minute)
    const isAllowed = rateLimit(`juejue:${user.id}`, 30, 60 * 1000);
    if (!isAllowed) {
      return NextResponse.json({ 
        message: "🤖 慢一點，JueJue 需要喘口氣，請稍後再試。", 
        status: "rate_limited" 
      }, { status: 429 });
    }

    const { content, history = [] } = await req.json();
    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "內容不可為空" }, { status: 400 });
    }

    // 3. Process with JueJue
    const juejue = new JueJue(user.id);
    const result = await juejue.process(content, history);

    // 4. Handle all-failed scenario with user's specific requirement
    if (result.status === "error") {
      return NextResponse.json({
        message: "JueJue 現在有點忙 😵‍💫，請稍後再試。",
        status: "error"
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[JueJue Route] Unexpected error:", error);
    return NextResponse.json({ 
      message: "JueJue 現在有點忙 😵‍💫，請稍後再試。", 
      status: "error" 
    });
  }
}
