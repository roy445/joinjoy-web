"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Sparkles, X } from "lucide-react";
import { useState } from "react";

export type HonorItem = {
  id: number; name: string; subtitle: string | null; description: string; story: string | null;
  type: "frame" | "title" | "badge" | string; price: number; rewardBonusPercent: number;
  effectConfig: Record<string, unknown> | null; owned: boolean; equipped: boolean; soldOut: boolean;
  remaining: number | null; saleActive: boolean; isFeatured: boolean; isFree: boolean;
  isTimeLimitedUse: boolean; useExpired: boolean; ownershipExpiresAt: string | null;
};

const toneMap: Record<string, { ring: string; glow: string; text: string; symbol: string }> = {
  sensory: { ring: "from-[#41d7c3] via-[#7cebd4] to-[#5f83ff]", glow: "bg-[#4fd7cb]/35", text: "text-[#9bf8df]", symbol: "✦" },
  mist: { ring: "from-[#a4e3d5] via-[#e5fff5] to-[#78b7e9]", glow: "bg-[#b3ece1]/30", text: "text-[#d8fff5]", symbol: "·" },
  galaxy: { ring: "from-[#9285ff] via-[#d9ccff] to-[#5e8bff]", glow: "bg-[#8e7fff]/35", text: "text-[#e1dbff]", symbol: "✦" },
  soft: { ring: "from-[#efac84] via-[#ffe5ba] to-[#db7180]", glow: "bg-[#ee9b7b]/25", text: "text-[#ffe5d4]", symbol: "·" },
  night: { ring: "from-[#5574ff] via-[#9fb6ff] to-[#6c4ba7]", glow: "bg-[#637bff]/30", text: "text-[#dbe4ff]", symbol: "✦" },
  star: { ring: "from-[#f7c65d] via-[#fff0a6] to-[#e98d35]", glow: "bg-[#f7bd4c]/30", text: "text-[#fff0b5]", symbol: "★" },
};

function getTone(item: HonorItem) { return toneMap[String(item.effectConfig?.theme ?? "sensory")] ?? toneMap.sensory; }

export function HonorVisual({ item, size = "md", interactive = true }: { item: HonorItem; size?: "sm" | "md" | "lg"; interactive?: boolean }) {
  const tone = getTone(item);
  const compact = size === "sm";
  const large = size === "lg";
  const count = compact ? 6 : Number(item.effectConfig?.particleCount ?? 18);
  return (
    <div className={`honor-visual relative flex items-center justify-center ${large ? "h-72 w-72" : compact ? "h-32 w-32" : "h-44 w-full"}`} aria-label={`${item.name}動態預覽`}>
      <div className={`absolute inset-1 rounded-[32%] bg-gradient-to-br ${tone.ring} opacity-90 blur-[1px] ${item.type === "frame" ? "" : "rounded-full"}`} />
      <div className={`absolute inset-2 rounded-[30%] ${tone.glow} blur-xl animate-glow-pulse`} />
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={`honor-particle absolute ${tone.text}`} style={{ left: `${12 + ((index * 37) % 76)}%`, top: `${10 + ((index * 53) % 78)}%`, animationDelay: `${(index % 7) * 0.35}s`, animationDuration: `${2.2 + (index % 4) * 0.6}s` }}>{tone.symbol}</span>
      ))}
      <motion.div whileHover={interactive ? { scale: 1.05, rotate: item.type === "badge" ? 6 : 0 } : undefined} className={`relative z-10 flex items-center justify-center overflow-hidden rounded-full bg-[#f4d7c4] shadow-[0_8px_30px_rgba(26,54,50,.22)] ${large ? "h-44 w-44" : compact ? "h-20 w-20" : "h-28 w-28"}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-transparent to-brand-700/15" />
        <span className={`${large ? "text-6xl" : compact ? "text-3xl" : "text-5xl"}`}>🧑🏻</span>
        {item.type === "badge" && <span className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 py-0.5 text-xs shadow">{tone.symbol}</span>}
      </motion.div>
      {item.type === "title" && <div className={`absolute -bottom-1 z-20 rounded-full bg-black/35 px-3 py-1 text-center text-xs font-bold backdrop-blur ${tone.text}`}>{item.name}</div>}
    </div>
  );
}

export function HonorPreviewModal({ item, open, onClose }: { item: HonorItem | null; open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && item && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0d1819]/85 p-4 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
    <motion.div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-auto rounded-[32px] border border-white/15 bg-[#162827] p-6 text-white shadow-2xl md:p-10" initial={{ opacity: 0, scale: 0.94, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ type: "spring", stiffness: 240, damping: 24 }} onClick={(event) => event.stopPropagation()}>
      <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20" onClick={onClose} aria-label="關閉預覽"><X size={20} /></button>
      <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
        <div className="flex min-h-[330px] items-center justify-center rounded-[28px] bg-gradient-to-br from-[#24433d] via-[#182d2b] to-[#142021] p-6"><HonorVisual item={item} size="lg" /></div>
        <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#8de7d4]">FULLSCREEN LIVE PREVIEW</p><h2 className="font-display text-3xl font-extrabold md:text-4xl">{item.name}</h2><p className="mt-2 text-white/65">{item.subtitle}</p><p className="mt-6 leading-7 text-white/80">{item.description}</p>{item.story && <blockquote className="mt-6 border-l-2 border-[#65d6c3] pl-4 text-sm italic text-white/60">「{item.story}」</blockquote>}<div className="mt-7 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1.5">{item.type === "frame" ? "頭像框" : item.type === "title" ? "稱號" : "徽章"}</span><span className="rounded-full bg-[#64d7c1]/15 px-3 py-1.5 text-[#9bf8df]">J幣加成 +{item.rewardBonusPercent}%</span></div></div>
      </div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
}

export function HonorVisualTrigger({ item }: { item: HonorItem }) {
  const [open, setOpen] = useState(false);
  return <><button className="group relative block w-full text-left" onClick={() => setOpen(true)} aria-label={`預覽 ${item.name}`}><HonorVisual item={item} /><span className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"><Maximize2 size={12} /> 全螢幕預覽</span></button><HonorPreviewModal item={item} open={open} onClose={() => setOpen(false)} /></>;
}
