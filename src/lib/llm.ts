export async function invokeLLM(options: {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  response_format?: any;
  temperature?: number;
}) {
  const url = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";
  const key = process.env.BUILT_IN_FORGE_API_KEY;

  const res = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: options.model || "gpt-5-mini",
      messages: options.messages,
      response_format: options.response_format,
      temperature: options.temperature ?? 0.7,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error?.message || error.error || "LLM 呼叫失敗");
  }

  return res.json();
}
