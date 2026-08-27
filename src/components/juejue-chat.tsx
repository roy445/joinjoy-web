"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Bot, Sparkles, MapPin, Users, Dices, Coins, Trophy, HelpCircle, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { JueJueMascot, JueJueState } from "./juejue-mascot";

type Message = {
  role: "user" | "assistant";
  content: string;
  status?: "success" | "error" | "loading";
};

const QUICK_ACTIONS = [
  { id: "plan", label: "🤖 幫我規劃", icon: Sparkles },
  { id: "place", label: "📍 幫我找地方", icon: MapPin },
  { id: "group", label: "👥 幫我揪團", icon: Users },
  { id: "idea", label: "🎲 幫我想點子", icon: Dices },
  { id: "coins", label: "🪙 我的 J幣", icon: Coins },
  { id: "honor", label: "🏆 我的成就", icon: Trophy },
  { id: "help", label: "❓ 我想問問題", icon: HelpCircle },
];

export function JueJueChat({ userId }: { userId?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mascotState, setMascotState] = useState<JueJueState>("idle");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setMascotState("thinking");

    try {
      const response = await fetch("/api/juejue/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.message,
        status: data.status 
      }]);
      
      setMascotState(data.status === "success" ? "success" : "active");
      setTimeout(() => setMascotState("active"), 2000);
    } catch (error) {
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: error instanceof Error ? error.message : "JueJue 現在有點忙 😵‍💫，請稍後再試。",
        status: "error"
      }]);
      setMascotState("active");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-all hover:scale-110 active:scale-95"
        >
          <JueJueMascot state="idle" size={48} showGlow={false} />
          <div className="absolute -right-1 -top-1 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-coral-500 text-[10px] font-bold">
            Hi
          </div>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-3xl bg-app shadow-2xl ring-1 ring-[var(--color-border)] transition-all duration-300",
            isMinimized ? "h-16 w-72" : "h-[600px] w-[400px] max-w-[calc(100vw-48px)] max-h-[calc(100vh-48px)]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-brand-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <JueJueMascot state={mascotState} size={32} showGlow={false} />
              <div>
                <h3 className="text-sm font-bold">JueJue</h3>
                <p className="text-[10px] opacity-80">揪一揪 AI 助理</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-full p-1.5 hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 hover:bg-white/20"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-app-soft/30">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-6">
                    <JueJueMascot state="active" size={80} />
                    <div>
                      <h4 className="font-bold text-main">嗨！我是 JueJue 👋</h4>
                      <p className="text-xs text-soft mt-1">我是你的 JoinJoy 出遊好夥伴，想去哪裡玩或有什麼問題都可以問我喔！</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 w-full mt-4">
                      {QUICK_ACTIONS.slice(0, 4).map(action => (
                        <button
                          key={action.id}
                          onClick={() => handleSend(action.label)}
                          className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2 text-xs font-medium text-main hover:bg-brand-500/5 hover:border-brand-500/30 transition-all"
                        >
                          <span>{action.icon && <action.icon size={14} className="text-brand-500" />}</span>
                          {action.label.split(" ").pop()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex w-full animate-fade-up",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div 
                      className={cn(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                        msg.role === "user" 
                          ? "bg-brand-500 text-white rounded-tr-none" 
                          : "bg-app border border-[var(--color-border)] text-main rounded-tl-none"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start animate-fade-up">
                    <div className="bg-app border border-[var(--color-border)] rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-brand-500" />
                      <span className="text-xs text-soft">JueJue 正在思考...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-[var(--color-border)] bg-app">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                    placeholder="跟 JueJue 聊聊..."
                    className="flex-1 rounded-2xl border border-[var(--color-border)] bg-app-soft px-4 py-2 text-sm outline-none focus:border-brand-500/50 transition-all"
                  />
                  <button
                    onClick={() => handleSend(input)}
                    disabled={!input.trim() || loading}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-md disabled:opacity-50"
                  >
                    <Send size={18} />
                  </button>
                </div>
                
                {/* Quick Actions Scroll */}
                <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {QUICK_ACTIONS.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleSend(action.label)}
                      className="whitespace-nowrap rounded-full border border-[var(--color-border)] bg-app-soft px-3 py-1 text-[10px] font-bold text-soft hover:bg-brand-500/10 hover:text-brand-600 transition-all"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
