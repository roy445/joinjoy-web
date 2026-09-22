"use client";

import Link from "next/link";
import { CircleHelp, FileText, MessageSquareWarning, ShieldCheck } from "lucide-react";

export function SiteFooter() {
  return <footer className="mt-auto border-t border-[var(--color-border)] bg-app-soft px-5 py-8 text-sm text-soft md:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-display text-lg font-black text-main">JoinJoy 支援中心</p><p className="mt-1 max-w-md text-xs leading-5">遇到問題、想提供建議，或想了解資料如何被使用，都可以從這裡找到完整說明。</p></div><div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold"><Link href="/support/report" className="inline-flex items-center gap-1.5 hover:text-brand-600"><MessageSquareWarning size={14} /> 檢舉與回報</Link><Link href="/faq" className="inline-flex items-center gap-1.5 hover:text-brand-600"><CircleHelp size={14} /> 常見問題</Link><Link href="/terms" className="inline-flex items-center gap-1.5 hover:text-brand-600"><FileText size={14} /> 使用條款</Link><Link href="/privacy" className="inline-flex items-center gap-1.5 hover:text-brand-600"><FileText size={14} /> 隱私政策</Link><Link href="/safety" className="inline-flex items-center gap-1.5 hover:text-brand-600"><ShieldCheck size={14} /> 安全規範</Link></div></div></footer>;
}
