"use client";

import { useEffect, useState } from "react";

const BRAND_LETTERS = ["揪", "好", "咖"];
const TOTAL_MS = 2600;
const EXIT_MS = 600;

export function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const shown = window.sessionStorage.getItem("joinjoy-intro-shown");
    if (shown) return;
    setVisible(true);
    const leaveTimer = setTimeout(() => setLeaving(true), TOTAL_MS);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      window.sessionStorage.setItem("joinjoy-intro-shown", "1");
    }, TOTAL_MS + EXIT_MS);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  function skip() {
    setLeaving(true);
    window.sessionStorage.setItem("joinjoy-intro-shown", "1");
    setTimeout(() => setVisible(false), EXIT_MS);
  }

  if (!visible) return null;

  return (
    <div
      className={`aurora-bg fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden ${
        leaving ? "animate-exit-zoom" : "animate-aurora"
      }`}
      style={{ animationDuration: leaving ? `${EXIT_MS}ms` : undefined }}
    >
      {/* soft ambient blobs */}
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 animate-float rounded-full bg-brand-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute -right-16 bottom-16 h-72 w-72 animate-float rounded-full bg-coral-300/25 blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />

      {/* Logo assembly */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        {/* glow pulse behind logo */}
        <div className="animate-glow-pulse absolute inset-0 rounded-full bg-brand-400/30 blur-2xl" />

        {/* orbiting dots representing the "joinjoy" people-in-circle motif */}
        <div className="animate-orbit absolute inset-[-14px]">
          <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(51,153,144,0.7)]" />
        </div>
        <div className="animate-orbit-reverse absolute inset-[-14px]">
          <span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-coral-400 shadow-[0_0_10px_rgba(229,103,63,0.7)]" />
        </div>

        {/* drawing ring around the logo */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="47" fill="none" stroke="var(--color-brand-200)" strokeWidth="1.5" opacity="0.3" />
          <circle
            cx="50"
            cy="50"
            r="47"
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="300"
            className="animate-ring-draw"
          />
        </svg>

        {/* the logo itself, bouncing in */}
        <img
          src="/logo.png"
          alt="揪好咖"
          width={96}
          height={96}
          className="animate-logo-spin relative rounded-[26%] shadow-2xl"
        />
      </div>

      {/* Brand name, letters staggered in */}
      <div className="mt-6 flex items-center gap-1">
        {BRAND_LETTERS.map((letter, i) => (
          <span
            key={i}
            className="animate-letter-in font-display text-3xl font-extrabold text-brand-700"
            style={{ animationDelay: `${0.75 + i * 0.12}s` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <p
        className="animate-fade-up mt-2 text-xs font-semibold tracking-[0.3em] text-brand-500"
        style={{ animationDelay: "1.2s" }}
      >
        JOINJOY · 把喜歡的事變成一起的事
      </p>

      {/* progress bar */}
      <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-brand-900/10">
        <div className="animate-bar-fill h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-coral-400" />
      </div>

      <button
        onClick={skip}
        className="absolute bottom-6 right-6 rounded-full border border-brand-300/50 bg-white/40 px-4 py-1.5 text-xs font-semibold text-brand-700 backdrop-blur transition hover:bg-white/70"
      >
        跳過 →
      </button>
    </div>
  );
}
