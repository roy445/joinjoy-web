"use client";

import React from "react";

export function BetaBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white animate-beta-pulse ${className}`}>
      Beta
      {/* Particles with deterministic CSS-based variation */}
      <span className="pointer-events-none absolute inset-0 overflow-visible">
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            className="animate-particle absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-white/60"
            style={{
              "--x": `${(i % 3 - 1) * 20}px`,
              "--y": `${(Math.floor(i / 3) - 0.5) * 30}px`,
              animationDelay: `${i * 0.4}s`,
            } as React.CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}
