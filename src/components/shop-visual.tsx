"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, X } from "lucide-react";
import { useState } from "react";
import { AvatarDecoration } from "@/components/avatar-decoration";

export type ShopVisualItem = { id: number; name: string; type: "title" | "badge" | "frame"; description?: string | null; rarity: string; metadata?: Record<string, unknown> | null };

const palettes: Record<string, { border: string; glow: string; particle: string; glyphs: string[] }> = {
  common: { border: "from-[#75c9a0] via-[#d9f4c7] to-[#5b9f83]", glow: "bg-[#75c9a0]/20", particle: "text-[#b5e5bc]", glyphs: ["🌿", "·", "✦"] },
  rare: { border: "from-[#5ad5c5] via-[#e9fff8] to-[#498cff]", glow: "bg-[#5ad5c5]/30", particle: "text-[#a4f2e4]", glyphs: ["⭐", "✦", "·"] },
  epic: { border: "from-[#ff9b78] via-[#ffe7d2] to-[#a974ff]", glow: "bg-[#ff9b78]/30", particle: "text-[#ffd0bd]", glyphs: ["♥", "✦", "●"] },
  legendary: { border: "from-[#bf953f] via-[#fff1a8] to-[#aa771c]", glow: "bg-[#f5d98a]/35", particle: "text-[#ffe9a4]", glyphs: ["✦", "★", "·"] },
};
const themeOverrides: Record<string, Partial<(typeof palettes)["legendary"]>> = {
  breeze: { border: "from-[#75c9a0] via-[#d9f4c7] to-[#5b9f83]", glow: "bg-[#75c9a0]/20", particle: "text-[#b5e5bc]", glyphs: ["🌿", "·", "✦"] },
  ocean: { border: "from-[#3da9dd] via-[#b6f2ff] to-[#2867b2]", glow: "bg-[#3da9dd]/25", particle: "text-[#b6f2ff]", glyphs: ["○", "◦", "✧"] },
  galaxy: { border: "from-[#5c5be2] via-[#e4c4ff] to-[#263f9d]", glow: "bg-[#745bff]/30", particle: "text-[#e4d4ff]", glyphs: ["✦", "·", "★"] },
  thunder: { border: "from-[#75eaff] via-[#fffbd0] to-[#5f6eff]", glow: "bg-[#75eaff]/25", particle: "text-[#e6fcff]", glyphs: ["⚡", "·", "✧"] },
  flame: { border: "from-[#ff784d] via-[#ffd16b] to-[#b92e2e]", glow: "bg-[#ff784d]/25", particle: "text-[#ffd16b]", glyphs: ["🔥", "·", "✦"] },
  rift: { border: "from-[#745bff] via-[#d4bbff] to-[#27c6de]", glow: "bg-[#745bff]/30", particle: "text-[#d4bbff]", glyphs: ["·", "✦", "◌"] },
  joinjoy: { border: "from-[#35e5cf] via-[#fff2be] to-[#6d5eff]", glow: "bg-[#35e5cf]/30", particle: "text-[#dffff7]", glyphs: ["✦", "★", "·"] },
};

export function ShopVisual({ item, large = false }: { item: ShopVisualItem; large?: boolean }) {
  const metadata = item.metadata ?? {};
  const basePalette = palettes[item.rarity] ?? palettes.rare;
  const palette = { ...basePalette, ...(themeOverrides[String(metadata.theme ?? "")] ?? {}) };
  const particleCount = large ? Number(metadata.particleCount ?? 28) : Number(metadata.particleCount ?? 12);
  return <div className={`relative flex items-center justify-center ${large ? "h-80 w-full" : "h-full w-full"}`}>
    <div className={`absolute ${large ? "inset-16" : "inset-10"} rounded-full ${palette.glow} blur-3xl animate-glow-pulse`} />
    {item.type === "frame" ? <AvatarDecoration frameName={item.name} size={large ? "lg" : "md"} preview={large} /> : <>{Array.from({ length: particleCount }).map((_, i) => <span key={i} className={`absolute ${palette.particle} shop-particle`} style={{ left: `${10 + ((i * 41) % 80)}%`, top: `${8 + ((i * 53) % 82)}%`, animationDelay: `${(i % 9) * 0.22}s`, animationDuration: `${2 + (i % 5) * 0.5}s` }}>{palette.glyphs[i % palette.glyphs.length]}</span>)}{item.type === "title" ? <motion.div whileHover={{ scale: 1.06 }} className={`relative z-10 rounded-2xl bg-white/90 px-6 py-4 text-center text-xl font-black text-brand-700 shadow-xl dark:bg-slate-800 dark:text-brand-200 ${item.rarity === "legendary" ? "animate-gold-glow" : ""}`}>{item.name}<span className="mt-1 block text-[10px] font-bold tracking-[0.2em] text-soft">TITLE</span></motion.div> : <motion.div whileHover={{ scale: 1.06, rotate: 8 }} className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-white shadow-xl dark:border-slate-600 dark:bg-slate-800"><span className="text-5xl">✦</span></motion.div>}</>}
  </div>;
}

export function ShopPreviewButton({ item }: { item: ShopVisualItem }) {
  const [open, setOpen] = useState(false);
  return <><button className="group relative h-full w-full" onClick={() => setOpen(true)} aria-label={`預覽${item.name}`}><ShopVisual item={item} /><span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/35 px-2 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><Maximize2 size={12} /> 全螢幕預覽</span></button><AnimatePresence>{open && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b1717]/85 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}><motion.div className="relative grid max-h-[92vh] w-full max-w-4xl gap-6 overflow-auto rounded-[32px] bg-[#172a29] p-6 text-white shadow-2xl md:grid-cols-[1.1fr_0.9fr] md:p-10" initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} onClick={(e) => e.stopPropagation()}><button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2" aria-label="關閉預覽"><X size={20} /></button><div className="flex min-h-[320px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#284943] to-[#101d20]"><ShopVisual item={item} large /></div><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9bf8df]">LIVE FULLSCREEN PREVIEW</p><h2 className="mt-3 font-display text-3xl font-black">{item.name}</h2><p className="mt-4 leading-7 text-white/70">{item.description || "這件收藏品擁有獨立的 JoinJoy 視覺效果，點擊預覽可以在兌換前查看完整展示。"}</p><div className="mt-6 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">{item.type === "frame" ? "動態頭像框" : item.type === "title" ? "光效稱號" : "互動徽章"}</span><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs">{item.rarity.toUpperCase()}</span></div></div></motion.div></motion.div>}</AnimatePresence></>;
}
