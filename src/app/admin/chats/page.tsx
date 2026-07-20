"use client";

import { useEffect, useState } from "react";
import { SectionTitle, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { Trash2, MessagesSquare } from "lucide-react";

export default function AdminChatsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  function loadRooms() {
    fetch("/api/admin/chats").then((r) => r.json()).then((d) => setRooms((d.rooms || []).filter((r: any) => r.messageCount > 0)));
  }
  useEffect(() => { loadRooms(); }, []);

  function openRoom(eventId: number) {
    setSelected(eventId);
    fetch(`/api/admin/chats?eventId=${eventId}`).then((r) => r.json()).then((d) => setMessages(d.messages || []));
  }

  async function removeMessage(messageId: number) {
    await fetch(`/api/admin/chats?messageId=${messageId}`, { method: "DELETE" });
    if (selected) openRoom(selected);
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle eyebrow="ADMIN" title="聊天室管理" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-2">
          {rooms.length === 0 ? <EmptyState icon="💬" title="目前沒有聊天室訊息" /> : rooms.map((r) => (
            <button key={r.eventId} onClick={() => openRoom(r.eventId)} className={`card-surface flex items-center gap-2 rounded-2xl p-3 text-left transition ${selected === r.eventId ? "ring-2 ring-brand-400" : ""}`}>
              <MessagesSquare size={16} className="text-brand-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-main">{r.title}</p>
                <p className="text-xs text-soft">{r.messageCount} 則訊息</p>
              </div>
            </button>
          ))}
        </div>
        <div className="card-surface flex flex-col gap-2 rounded-2xl p-4" style={{ maxHeight: 500, overflowY: "auto" }}>
          {selected === null ? (
            <p className="text-sm text-soft">選擇左側聊天室查看訊息</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-soft">此聊天室尚無訊息</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-app-soft p-2.5">
                <div className="min-w-0">
                  <p className="text-xs text-soft">{m.type} · {timeAgo(m.createdAt)}</p>
                  <p className={`text-sm ${m.isDeleted ? "text-soft line-through" : "text-main"}`}>{m.content || "[圖片訊息]"}</p>
                </div>
                {!m.isDeleted && (
                  <button onClick={() => removeMessage(m.id)} className="shrink-0 rounded-full bg-rose-500/10 p-1.5 text-rose-500"><Trash2 size={12} /></button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
