"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";

type Announcement = { id: number; title: string; content: string; severity: string; kind: string };
export function SystemAnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const load = () => fetch("/api/support", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((d) => setItems(d?.announcements || [])).catch(() => undefined);
  useEffect(() => { load(); const timer = window.setInterval(load, 30000); const refresh = () => load(); window.addEventListener("joinjoy:support-updated", refresh); return () => { window.clearInterval(timer); window.removeEventListener("joinjoy:support-updated", refresh); }; }, []);
  if (!items.length) return null;
  return <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100"><div className="mx-auto flex max-w-7xl items-start gap-3"><BellRing className="mt-0.5 shrink-0 text-amber-500" size={18} /><div className="min-w-0 flex-1">{items.slice(0, 2).map((item) => <div key={item.id} className="mb-2 last:mb-0"><p className="font-black">{item.title}</p><p className="mt-0.5 text-xs leading-5 opacity-80">{item.content}</p></div>)}<Link href="/support/errors" className="text-xs font-bold underline underline-offset-2">查看錯誤代碼與處理方式</Link></div><button type="button" onClick={() => setItems([])} className="rounded-full p-1 opacity-60 hover:bg-black/5" aria-label="關閉公告"><X size={16} /></button></div></div>;
}
