import { NextRequest, NextResponse } from "next/server";
import { invokeLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { messages, currentForm } = await req.json();

    const systemPrompt = `你是一個專業的旅遊規劃助手。你的任務是從對話中提取出遊規劃所需的參數。
所需的參數包括：
- people: 人數 (數字)
- budget: 每人預算 (數字，單位台幣)
- date: 日期 (YYYY-MM-DD)
- start: 開始時間 (HH:mm)
- end: 結束時間 (HH:mm)
- origin: 出發地點 (例如：台中、台北車站)
- vibe: 氛圍 (例如：輕鬆聊天、拍照打卡、刺激好玩、美食優先、購物逛街)
- indoor: 是否優先室內 (布林值)

目前已有的參數：${JSON.stringify(currentForm)}

請分析最新的對話內容：
1. 更新已有的參數。
2. 如果參數完整，請回傳 "COMPLETE" 並提供更新後的 JSON。
3. 如果參數不完整，請以親切的口吻追問缺失的資訊，並回傳 "ASKING" 以及訊息。

請務必以 JSON 格式回傳，格式如下：
{
  "status": "COMPLETE" | "ASKING",
  "message": "追問的訊息或確認訊息",
  "form": { ... 更新後的參數 ... }
}`;

    const res = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "planner_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              status: { type: "string", enum: ["COMPLETE", "ASKING"] },
              message: { type: "string" },
              form: {
                type: "object",
                properties: {
                  people: { type: "number" },
                  budget: { type: "number" },
                  date: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  origin: { type: "string" },
                  vibe: { type: "string" },
                  indoor: { type: "boolean" }
                },
                required: ["people", "budget", "date", "start", "end", "origin", "vibe", "indoor"],
                additionalProperties: false
              }
            },
            required: ["status", "message", "form"],
            additionalProperties: false
          }
        }
      }
    });

    const result = JSON.parse(res.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Planner Chat Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
