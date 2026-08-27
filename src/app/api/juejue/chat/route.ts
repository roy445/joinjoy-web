import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { JueJue } from "@/lib/juejue";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "請先登入以使用 JueJue" }, { status: 401 });
    }

    const { content, history = [] } = await req.json();
    if (!content) {
      return NextResponse.json({ error: "內容不可為空" }, { status: 400 });
    }

    const juejue = new JueJue(user.id);
    const result = await juejue.process(content, history);

    return NextResponse.json(result);
  } catch (error) {
    console.error("API JueJue Chat Error:", error);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
