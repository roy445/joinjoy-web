"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, MessageSquare, User, CheckCircle2 } from "lucide-react";

type PlannerForm = {
  people: number;
  budget: number;
  date: string;
  start: string;
  end: string;
  origin: string;
  vibe: string;
  indoor: boolean;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function PlannerChat({ onComplete, currentForm }: { onComplete: (form: PlannerForm) => void, currentForm: PlannerForm }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "嗨！我是你的 AI 規劃助手。想去哪裡玩呢？你可以直接告訴我，例如：『我想在週六下午帶 4 個朋友去台中吃美食，預算大概每人 800 元。』" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/planner/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMsg }],
          currentForm
        })
      });

      const data = await res.json();
      if (data.status === "COMPLETE") {
        setMessages(prev => [...prev, { role: "assistant", content: data.message + " ✨ 已經為你填好表單囉，點擊下方的『開始規劃』即可生成行程！" }]);
        onComplete(data.form);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "抱歉，我現在有點累了，請稍後再試或直接手動填寫表單。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[450px] bg-app-soft rounded-3xl border border-brand-500/20 overflow-hidden shadow-inner">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex max-w-[85%] gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-white text-brand-500 shadow-sm"}`}>
                {msg.role === "user" ? <User size={16} /> : <Sparkles size={16} />}
              </div>
              <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.role === "user" ? "bg-brand-500 text-white" : "bg-white text-main"}`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-500 shadow-sm">
                <Loader2 size={16} className="animate-spin" />
              </div>
              <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-soft shadow-sm italic">
                正在思考你的行程...
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      
      <div className="p-4 bg-surface border-t border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="輸入你的需求..."
            className="flex-1 bg-app rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm outline-none focus:border-brand-500 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="btn-brand rounded-xl px-4 py-2.5 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
