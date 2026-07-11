"use client";

import { ArrowLeft, Bookmark, CalendarDays, Check, Flag, MapPin, MessageCircle, Send, Share2, ShieldCheck, Ticket, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type Activity = { id: string; title: string; coverUrl: string; category: string; description: string; startAt: string; endAt: string; location: string; mapUrl: string | null; capacity: number; price: number; contact: string; notes: string | null; allowWaitlist: boolean; requiresApproval: boolean; tags: string[]; attendeeCount: number; isFavorite: boolean; host: { id: string; name: string; email: string; creditScore: number }; participants: { id: string; userId: string; name: string; status: string }[] };
type Comment = { id: string; content: string; createdAt: string; userName: string };
type ChatMessage = { id: string; content: string; createdAt: string; userName: string; isAnnouncement: boolean };

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [event, setEvent] = useState<Activity | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => { params.then(({ eventId: id }) => setEventId(id)); }, [params]);
  useEffect(() => {
    if (!eventId) return;
    void Promise.all([fetch(`/api/events/${eventId}`).then((response) => response.json()), fetch(`/api/events/${eventId}/comments`).then((response) => response.json())]).then(([eventData, commentData]) => { if (eventData.event) setEvent(eventData.event); setComments(commentData.comments ?? []); });
  }, [eventId]);

  async function refreshChat() {
    if (!eventId) return;
    const response = await fetch(`/api/events/${eventId}/messages`, { credentials: "include" });
    if (response.ok) setMessages((await response.json()).messages ?? []);
  }
  async function join() {
    if (!eventId) return; setBusy(true);
    const alreadyJoined = event?.participants.some((participant) => participant.status === "joined");
    const response = await fetch(`/api/events/${eventId}/join`, { method: alreadyJoined ? "DELETE" : "POST", credentials: "include" });
    const data = await response.json() as { message?: string };
    setNotice(data.message ?? "操作完成"); setBusy(false);
    if (response.ok && !alreadyJoined) { const detail = await fetch(`/api/events/${eventId}`).then((item) => item.json()); if (detail.event) setEvent(detail.event); }
  }
  async function favorite() {
    if (!eventId || !event) return;
    const response = await fetch(`/api/events/${eventId}/favorite`, { method: event.isFavorite ? "DELETE" : "POST", credentials: "include" });
    if (response.ok) setEvent({ ...event, isFavorite: !event.isFavorite }); else setNotice((await response.json()).message ?? "請先登入");
  }
  async function postComment() {
    if (!eventId || !comment.trim()) return;
    const response = await fetch(`/api/events/${eventId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ content: comment }) });
    const data = await response.json() as { message?: string; comment?: Comment };
    if (!response.ok) { setNotice(data.message ?? "留言失敗"); return; }
    setComment(""); setNotice("留言已送出"); const refreshed = await fetch(`/api/events/${eventId}/comments`).then((item) => item.json()); setComments(refreshed.comments ?? []);
  }
  async function postMessage() {
    if (!eventId || !message.trim()) return;
    const response = await fetch(`/api/events/${eventId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ content: message }) });
    const data = await response.json() as { message?: string };
    if (!response.ok) { setNotice(data.message ?? "訊息發送失敗"); return; }
    setMessage(""); await refreshChat();
  }
  async function report() {
    if (!eventId) return;
    const response = await fetch(`/api/events/${eventId}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ reason: "活動內容需要確認", details: "由活動詳情頁提出檢舉" }) });
    setNotice((await response.json()).message ?? (response.ok ? "檢舉已送出" : "檢舉失敗"));
  }

  if (!event) return <main className="event-page-loading"><ShieldCheck size={24} /><p>正在載入活動...</p></main>;
  const start = new Date(event.startAt); const end = new Date(event.endAt); const joined = event.participants.some((participant) => participant.status === "joined");
  return <main className="event-detail-page"><header className="event-detail-top"><a href="/" className="back-link"><ArrowLeft size={17} /> 回到探索</a><div><button onClick={favorite} className={event.isFavorite ? "event-top-action active" : "event-top-action"}><Bookmark size={17} fill={event.isFavorite ? "currentColor" : "none"} /></button><button className="event-top-action" onClick={() => { void navigator.clipboard?.writeText(window.location.href); setNotice("活動連結已複製"); }}><Share2 size={17} /></button><button className="event-top-action" onClick={() => void report()}><Flag size={17} /></button></div></header><section className="event-detail-hero"><div className="detail-cover" style={{ backgroundImage: `url(${event.coverUrl})` }}><span>{event.category}</span><h1>{event.title}</h1></div></section><div className="event-detail-layout"><article className="event-detail-main"><div className="detail-host"><div className="detail-host-avatar">{event.host.name.slice(0, 1)}</div><div><small>主辦人</small><strong>{event.host.name} <ShieldCheck size={13} /></strong><span>信用分數 {event.host.creditScore}</span></div><button>查看主辦人</button></div><div className="detail-facts"><div><CalendarDays size={18} /><span><small>活動時間</small><strong>{start.toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })} – {end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}</strong></span></div><div><MapPin size={18} /><span><small>集合地點</small><strong>{event.location}</strong>{event.mapUrl && <a href={event.mapUrl} target="_blank">開啟 Google 地圖</a>}</span></div><div><Users size={18} /><span><small>參加名額</small><strong>{event.attendeeCount} / {event.capacity} 人</strong></span></div><div><Ticket size={18} /><span><small>活動費用</small><strong>{event.price === 0 ? "免費參加" : `NT$ ${event.price.toLocaleString()} / 人`}</strong></span></div></div><section className="detail-copy"><h2>關於這場活動</h2><p>{event.description}</p>{event.notes && <div className="detail-note"><strong>注意事項</strong><p>{event.notes}</p></div>}<div className="detail-tags">{event.tags.map((tag) => <span key={tag}># {tag}</span>)}</div></section><section className="detail-comments"><div className="detail-section-heading"><h2><MessageCircle size={18} /> 活動留言</h2><span>{comments.length} 則留言</span></div>{comments.map((item) => <div className="detail-comment" key={item.id}><span>{item.userName.slice(0, 1)}</span><div><strong>{item.userName}</strong><p>{item.content}</p><small>{new Date(item.createdAt).toLocaleString("zh-TW")}</small></div></div>)}<div className="detail-input"><input value={comment} onChange={(input) => setComment(input.target.value)} placeholder="留下友善的留言..." onKeyDown={(input) => { if (input.key === "Enter") void postComment(); }} /><button onClick={() => void postComment()}><Send size={15} /></button></div></section></article><aside className="event-detail-side"><div className="detail-join-card"><span className="eyebrow">JOIN THIS GATHERING</span><strong>{event.attendeeCount} 位好咖已加入</strong><div className="detail-progress"><i style={{ width: `${Math.min(100, event.attendeeCount / event.capacity * 100)}%` }} /></div><small>還有 {Math.max(0, event.capacity - event.attendeeCount)} 個名額</small><button className={joined ? "detail-join joined" : "detail-join"} onClick={() => void join()} disabled={busy}>{joined ? <><Check size={17} /> 已報名，退出活動</> : "加入這場活動"}</button></div><div className="detail-chat-card"><div className="detail-section-heading"><h2><MessageCircle size={17} /> 活動聊天室</h2><button onClick={() => void refreshChat()}>刷新</button></div><div className="detail-chat-list">{messages.length === 0 ? <p className="chat-empty">加入活動後即可查看聊天室</p> : messages.slice(-8).map((item) => <div className={item.isAnnouncement ? "detail-chat announcement" : "detail-chat"} key={item.id}><span>{item.userName.slice(0, 1)}</span><p><strong>{item.userName}</strong>{item.content}</p></div>)}</div><div className="detail-input"><input value={message} onChange={(input) => setMessage(input.target.value)} placeholder="輸入聊天室訊息..." onKeyDown={(input) => { if (input.key === "Enter") void postMessage(); }} /><button onClick={() => void postMessage()}><Send size={15} /></button></div></div><div className="detail-safe"><ShieldCheck size={17} /><div><strong>揪好咖安心提醒</strong><p>請尊重每位參與者，若遇到不舒服的情況，可以隨時檢舉。</p></div></div></aside></div>{notice && <div className="detail-toast"><Check size={15} /> {notice}<button onClick={() => setNotice(null)}><X size={14} /></button></div>}</main>;
}
