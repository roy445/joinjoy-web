"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";

export function ErrorMessage({ code = "SYS-002", pagePath, title }: { code?: string; pagePath?: string; title?: string }) {
  return <div className="rounded-3xl border-2 border-rose-200 bg-rose-50 p-5 text-rose-900 shadow-sm dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-100"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 shrink-0 text-rose-500" size={24} /><div className="min-w-0 flex-1"><p className="font-display text-lg font-black">{title || "抱歉，遇到了一些錯誤"}</p><p className="mt-1 text-sm font-bold">錯誤代碼：<code className="rounded bg-white/70 px-1.5 py-0.5 dark:bg-black/20">{code}</code></p><p className="mt-2 text-sm leading-6 text-rose-800/80 dark:text-rose-100/75">如果方便的話，請點擊回報錯誤，讓建立者知道發生頁面與實際情況。</p><div className="mt-4 flex flex-wrap gap-2"><Link href={`/support/report?kind=error&code=${encodeURIComponent(code)}&page=${encodeURIComponent(pagePath || (typeof window !== "undefined" ? window.location.pathname : "/"))}`} className="inline-flex items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600">立即回報錯誤 <ExternalLink size={13} /></Link></div></div></div></div>;
}
