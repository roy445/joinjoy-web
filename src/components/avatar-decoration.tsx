"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type Theme = { key: string; colors: [string, string, string]; count: number; glyph: string };
const themes: Record<string, Theme> = {
  "🌿 清風漫遊": { key: "breeze", colors: ["#63b88d", "#d9f4c7", "#b9ead0"], count: 18, glyph: "leaf" },
  "⭐ 星光環遊": { key: "star", colors: ["#6b78e8", "#fff2a7", "#a9b8ff"], count: 24, glyph: "star" },
  "🌊 深海泡泡": { key: "ocean", colors: ["#1878b9", "#b6f2ff", "#55c8e7"], count: 24, glyph: "bubble" },
  "🍬 糖果派對": { key: "candy", colors: ["#ff7eaf", "#ffe59a", "#9cc8ff"], count: 25, glyph: "heart" },
  "🌌 銀河旅者": { key: "galaxy", colors: ["#3932ad", "#e4c4ff", "#6a9cff"], count: 34, glyph: "star" },
  "⚡ 雷霆疾行": { key: "thunder", colors: ["#5de9ff", "#fffbd0", "#6674ff"], count: 28, glyph: "bolt" },
  "🔥 焰心旅人": { key: "flame", colors: ["#b92e2e", "#ffd16b", "#ff784d"], count: 30, glyph: "ember" },
  "👑 黃金榮耀": { key: "gold", colors: ["#9a6a1a", "#fff3a0", "#e0a82e"], count: 30, glyph: "spark" },
  "🪐 時空裂隙": { key: "rift", colors: ["#4d3bd1", "#d4bbff", "#27c6de"], count: 38, glyph: "rift" },
  "🌠 JoinJoy 星域": { key: "joinjoy", colors: ["#35e5cf", "#fff2be", "#6d5eff"], count: 52, glyph: "cosmos" },
};

function themeFor(name?: string | null, metadata?: Record<string, unknown> | null) {
  const metadataTheme = typeof metadata?.theme === "string" ? metadata.theme : "";
  const direct = Object.values(themes).find((theme) => theme.key === metadataTheme);
  if (direct) return direct;
  const aliases: Array<[string, string]> = [["晨露", "breeze"], ["清風", "breeze"], ["珊瑚", "star"], ["星芒", "star"], ["泡泡", "ocean"], ["深海", "ocean"], ["糖果", "candy"], ["銀河", "galaxy"], ["旅途星河", "galaxy"], ["雷霆", "thunder"], ["閃電", "thunder"], ["焰心", "flame"], ["火焰", "flame"], ["金色", "gold"], ["黃金", "gold"], ["時空", "rift"], ["裂隙", "rift"], ["星域", "joinjoy"]];
  const match = aliases.find(([token]) => name?.includes(token));
  if (match) return Object.values(themes).find((theme) => theme.key === match[1]) ?? null;
  return Object.entries(themes).find(([label]) => name === label || name?.includes(label.slice(2)))?.[1] ?? null;
}

function ParticleCanvas({ theme, full }: { theme: Theme; full: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let frame = 0; let raf = 0; const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { const box = canvas.getBoundingClientRect(); canvas.width = box.width * dpr; canvas.height = box.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const bounds = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });
    const particles = Array.from({ length: full ? theme.count : Math.min(theme.count, 11) }, (_, i) => ({ a: (i / theme.count) * Math.PI * 2, r: 43 + ((i * 17) % 25), speed: 0.0015 + (i % 5) * 0.00035, size: 1.1 + (i % 4) * 0.65, drift: (i % 2 ? 1 : -1) * (2 + i % 4) }));
    const draw = (time: number) => { const { w, h } = bounds(); ctx.clearRect(0, 0, w, h); const cx = w / 2, cy = h / 2, scale = Math.min(w, h) / 2;
      particles.forEach((p, i) => { const angle = p.a + time * p.speed * (theme.key === "thunder" ? 4 : 1); const rr = p.r + Math.sin(time * 0.002 + i) * p.drift; const x = cx + Math.cos(angle) * scale * rr / 100; const y = cy + Math.sin(angle) * scale * rr / 100; const alpha = 0.45 + (Math.sin(time * 0.003 + i) + 1) * 0.25; ctx.globalAlpha = alpha; ctx.fillStyle = theme.colors[i % theme.colors.length]; ctx.shadowColor = theme.colors[(i + 1) % theme.colors.length]; ctx.shadowBlur = theme.key === "joinjoy" || theme.key === "galaxy" ? 10 : 5;
        if (theme.key === "ocean") { ctx.beginPath(); ctx.arc(x, y, p.size * 1.8, 0, Math.PI * 2); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1; ctx.stroke(); } else if (theme.key === "thunder") { ctx.beginPath(); ctx.moveTo(x - 3, y - 3); ctx.lineTo(x + 1, y); ctx.lineTo(x - 2, y + 1); ctx.lineTo(x + 3, y + 5); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.2; ctx.stroke(); } else { ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill(); }
      }); ctx.globalAlpha = 1; ctx.shadowBlur = 0; frame = time; raf = requestAnimationFrame(draw); };
    raf = requestAnimationFrame(draw); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); void frame; };
  }, [theme, full]);
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-[-20%] z-20 h-[140%] w-[140%]" aria-hidden="true" />;
}

function OrnamentSvg({ theme }: { theme: Theme }) {
  const c = theme.colors;
  if (theme.key === "breeze") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-13%] z-30 h-[126%] w-[126%] overflow-visible"><path d="M22 116 C10 82 42 42 80 27" fill="none" stroke={c[0]} strokeWidth="2" strokeDasharray="2 7" opacity=".75"/><path d="M171 85 C187 114 164 151 128 173" fill="none" stroke={c[1]} strokeWidth="2" strokeDasharray="3 6"/><text x="18" y="72" fill={c[0]} fontSize="18">❧</text><text x="163" y="145" fill={c[1]} fontSize="16">❧</text></svg>;
  if (theme.key === "star") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-15%] z-30 h-[130%] w-[130%]"><ellipse cx="100" cy="100" rx="91" ry="72" fill="none" stroke={c[2]} strokeWidth="1.5" opacity=".7" className="avatar-orbit"/><text x="15" y="55" fill={c[1]} fontSize="18">✦</text><text x="161" y="158" fill={c[1]} fontSize="15">★</text></svg>;
  if (theme.key === "ocean") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-15%] z-30 h-[130%] w-[130%]"><circle cx="100" cy="100" r="85" fill="none" stroke={c[0]} strokeWidth="3" opacity=".6" strokeDasharray="36 10"/><path d="M25 118 Q50 94 75 118 T125 118 T175 118" fill="none" stroke={c[2]} strokeWidth="2" opacity=".8"/><circle cx="36" cy="60" r="8" fill="none" stroke={c[1]} strokeWidth="2"/><circle cx="166" cy="132" r="5" fill="none" stroke={c[1]} strokeWidth="1.5"/></svg>;
  if (theme.key === "candy") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-17%] z-30 h-[134%] w-[134%]"><ellipse cx="100" cy="100" rx="91" ry="80" fill="none" stroke={c[0]} strokeWidth="2" strokeDasharray="6 8" className="avatar-orbit"/><text x="17" y="85" fill={c[0]} fontSize="17">♥</text><text x="155" y="64" fill={c[1]} fontSize="17">✦</text><text x="158" y="150" fill={c[2]} fontSize="16">●</text></svg>;
  if (theme.key === "thunder") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-15%] z-30 h-[130%] w-[130%]"><circle cx="100" cy="100" r="86" fill="none" stroke={c[0]} strokeWidth="3" strokeDasharray="22 6" className="avatar-orbit"/><path d="M38 47 L54 75 L45 76 L63 103" fill="none" stroke={c[1]} strokeWidth="3" strokeLinecap="round"/><path d="M156 132 L166 149 L158 150 L170 166" fill="none" stroke={c[2]} strokeWidth="2"/></svg>;
  if (theme.key === "flame") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-16%] z-30 h-[132%] w-[132%]"><path d="M32 134 C18 108 44 89 48 66 C63 84 61 96 70 102 C72 75 94 65 98 39 C117 69 104 90 121 100 C128 84 143 79 151 60 C166 94 178 118 160 143" fill="none" stroke={c[2]} strokeWidth="4" strokeLinecap="round" className="avatar-orbit"/><path d="M35 146 Q100 181 165 146" fill="none" stroke={c[1]} strokeWidth="3" opacity=".8"/></svg>;
  if (theme.key === "gold") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-18%] z-30 h-[136%] w-[136%]"><path d="M66 43 L77 18 L100 38 L123 18 L135 43" fill="none" stroke={c[1]} strokeWidth="5" strokeLinejoin="round"/><circle cx="100" cy="101" r="89" fill="none" stroke={c[0]} strokeWidth="3" strokeDasharray="48 18" className="avatar-orbit"/><text x="31" y="156" fill={c[1]} fontSize="20">✦</text><text x="157" y="61" fill={c[1]} fontSize="18">✦</text></svg>;
  if (theme.key === "rift") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-20%] z-30 h-[140%] w-[140%]"><ellipse cx="100" cy="100" rx="96" ry="48" fill="none" stroke={c[2]} strokeWidth="2" className="avatar-orbit"/><ellipse cx="100" cy="100" rx="48" ry="96" fill="none" stroke={c[1]} strokeWidth="1.5" className="avatar-orbit-reverse"/><path d="M83 38 L106 74 L94 103 L123 139" fill="none" stroke={c[1]} strokeWidth="2" strokeDasharray="4 4"/></svg>;
  if (theme.key === "joinjoy") return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-28%] z-30 h-[156%] w-[156%]"><ellipse cx="100" cy="100" rx="98" ry="52" fill="none" stroke={c[0]} strokeWidth="2" className="avatar-orbit"/><ellipse cx="100" cy="100" rx="52" ry="98" fill="none" stroke={c[1]} strokeWidth="2" className="avatar-orbit-reverse"/><circle cx="100" cy="100" r="92" fill="none" stroke={c[2]} strokeWidth="1" strokeDasharray="2 7"/><text x="18" y="48" fill={c[1]} fontSize="18">✦</text><text x="162" y="166" fill={c[0]} fontSize="18">★</text></svg>;
  return <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[-15%] z-30 h-[130%] w-[130%]"><circle cx="100" cy="100" r="88" fill="none" stroke={c[1]} strokeWidth="2" /></svg>;
}

export function AvatarDecoration({ src, alt = "", frameName, metadata, size = "md", preview = false }: { src?: string | null; alt?: string; frameName?: string | null; metadata?: Record<string, unknown> | null; size?: "sm" | "md" | "lg"; preview?: boolean }) {
  const dims = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-36 w-36" : "h-12 w-12";
  if (!frameName) return <div className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-transparent ${dims}`}>{src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full" aria-hidden="true" />}</div>;
  const theme = themeFor(frameName, metadata) ?? themes["🌿 清風漫遊"];
  return <div className={`avatar-decoration relative inline-flex shrink-0 items-center justify-center ${dims}`} data-theme={theme.key} data-decoration-name={frameName} aria-label={frameName}><div className="absolute inset-[-8%] rounded-full opacity-30 blur-md" style={{ background: `radial-gradient(circle, ${theme.colors[1]}, transparent 68%)` }} /><ParticleCanvas theme={theme} full={preview || size === "lg"} /><OrnamentSvg theme={theme} /><motion.div className="relative z-10 h-[78%] w-[78%] overflow-hidden rounded-full bg-[#f3d4c4] ring-2 ring-white/90 shadow-[0_5px_22px_rgba(18,46,43,.28)]" animate={theme.key === "joinjoy" ? { scale: [1, 1.02, 1] } : undefined} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>{src ? <img src={src} alt={alt} className="h-full w-full object-cover" /> : <div className="h-full w-full" aria-hidden="true" />}</motion.div></div>;
}
