"use client";

import { motion } from "framer-motion";

const frameThemes: Record<string, { key: string; colors: string; glyphs: string[]; count: number }> = {
  "🌿 清風漫遊": { key: "breeze", colors: "from-[#75c9a0] via-[#d9f4c7] to-[#5b9f83]", glyphs: ["🌿", "·", "✦"], count: 8 },
  "⭐ 星光環遊": { key: "star", colors: "from-[#8fa8ff] via-[#fff2a7] to-[#6674d7]", glyphs: ["⭐", "✦", "·"], count: 10 },
  "🌊 深海泡泡": { key: "ocean", colors: "from-[#3da9dd] via-[#b6f2ff] to-[#2867b2]", glyphs: ["○", "◦", "✧"], count: 12 },
  "🍬 糖果派對": { key: "candy", colors: "from-[#ff9cc4] via-[#ffe59a] to-[#9cc8ff]", glyphs: ["♥", "✦", "●"], count: 13 },
  "🌌 銀河旅者": { key: "galaxy", colors: "from-[#5c5be2] via-[#e4c4ff] to-[#263f9d]", glyphs: ["✦", "·", "★"], count: 18 },
  "⚡ 雷霆疾行": { key: "thunder", colors: "from-[#75eaff] via-[#fffbd0] to-[#5f6eff]", glyphs: ["⚡", "·", "✧"], count: 12 },
  "🔥 焰心旅人": { key: "flame", colors: "from-[#ff784d] via-[#ffd16b] to-[#b92e2e]", glyphs: ["🔥", "·", "✦"], count: 15 },
  "👑 黃金榮耀": { key: "gold", colors: "from-[#bf953f] via-[#fff3a0] to-[#9a6a1a]", glyphs: ["✦", "·", "★"], count: 16 },
  "🪐 時空裂隙": { key: "rift", colors: "from-[#745bff] via-[#d4bbff] to-[#27c6de]", glyphs: ["·", "✦", "◌"], count: 20 },
  "🌠 JoinJoy 星域": { key: "joinjoy", colors: "from-[#35e5cf] via-[#fff2be] to-[#6d5eff]", glyphs: ["✦", "★", "·"], count: 26 },
};

function themeFor(frameName?: string | null) { return Object.entries(frameThemes).find(([name]) => frameName === name || frameName?.includes(name.slice(2)))?.[1] ?? frameThemes["🌿 清風漫遊"]; }

export function AvatarDecoration({ src, alt = "", frameName, size = "md", preview = false }: { src?: string | null; alt?: string; frameName?: string | null; size?: "sm" | "md" | "lg"; preview?: boolean }) {
  const dims = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-36 w-36" : "h-12 w-12";
  if (!frameName) return <div className={`relative inline-flex shrink-0 overflow-hidden rounded-full ${dims}`}><img src={src || `https://api.dicebear.com/9.x/notionists/svg?seed=joinjoy`} alt={alt} className="h-full w-full object-cover" /></div>;
  const theme = themeFor(frameName); const particleCount = preview ? theme.count : Math.min(theme.count, 7);
  return <div className={`avatar-decoration relative inline-flex shrink-0 items-center justify-center ${dims}`} data-theme={theme.key} aria-label={frameName || "頭像"}><div className={`absolute inset-[-9%] rounded-full bg-gradient-to-br ${theme.colors} opacity-90 blur-[1px]`} /><div className="absolute inset-[-15%] rounded-full border border-white/45 opacity-70 avatar-orbit" />{Array.from({ length: particleCount }).map((_, i) => <motion.span key={i} className="absolute z-20 text-[0.68em] leading-none" style={{ left: `${4 + ((i * 43) % 92)}%`, top: `${1 + ((i * 59) % 94)}%` }} animate={{ y: [0, -4, 0], opacity: [0.55, 1, 0.55], rotate: [0, i % 2 ? 12 : -12, 0] }} transition={{ duration: 2.4 + (i % 4) * 0.45, repeat: Infinity, delay: i * 0.11, ease: "easeInOut" }}>{theme.glyphs[i % theme.glyphs.length]}</motion.span>)}{theme.key === "gold" && <span className="absolute -top-[30%] z-30 text-[1.15em] drop-shadow-[0_0_8px_rgba(255,214,86,.8)]">♛</span>}{theme.key === "flame" && <span className="absolute -bottom-[10%] z-30 text-[0.95em]">🔥</span>}{theme.key === "candy" && <span className="absolute -right-[18%] -top-[10%] z-30 text-[0.85em]">🍬</span>}<div className="relative z-10 h-[84%] w-[84%] overflow-hidden rounded-full bg-[#f3d4c1] ring-2 ring-white/80 shadow-[0_5px_20px_rgba(18,46,43,.22)]">{src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[1.7em]">🧑🏻</div>}</div>{theme.key === "joinjoy" && <div className="absolute inset-[-28%] rounded-full border border-dashed border-[#c8fff4]/70 avatar-orbit-reverse" />}</div>;
}
