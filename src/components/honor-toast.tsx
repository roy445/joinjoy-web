"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, Star, Award, Crown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export type HonorType = "group" | "title" | "badge";

interface HonorToastProps {
  type: HonorType;
  title: string;
  content?: string;
  onClose: () => void;
}

export function HonorToast({ type, title, content, onClose }: HonorToastProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeout(() => setVisible(true), 10);
    
    // Fire heavy celebratory confetti
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999, colors: ['#10b981', '#f97316', '#fbbf24', '#ffffff'] };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 70 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      // Add stars and circles
      confetti({ ...defaults, particleCount: 20, shapes: ['star'], origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 200);

    const timer = setTimeout(() => {
      handleClose();
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  if (!mounted) return null;

  const getIcon = () => {
    switch (type) {
      case "group": return <Crown className="text-amber-500" size={48} />;
      case "title": return <Award className="text-brand-500" size={48} />;
      case "badge": return <Star className="text-coral-500" size={48} />;
      default: return <Trophy className="text-amber-500" size={48} />;
    }
  };

  const getLabel = () => {
    switch (type) {
      case "group": return "晉升身分組";
      case "title": return "獲得新稱號";
      case "badge": return "獲得新徽章";
      default: return "達成成就";
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
      <div 
        className={cn(
          "w-full max-w-md pointer-events-auto overflow-hidden rounded-[2.5rem] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-[6px] border-brand-500 transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1)",
          visible ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-20"
        )}
      >
        <div className="relative p-10 text-center">
          {/* Top Header Section with solid brand color */}
          <div className="absolute inset-x-0 top-0 h-32 bg-brand-600" />
          
          <button 
            onClick={handleClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="relative z-10 mb-8 flex justify-center pt-2">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-white/30 blur-xl" />
              <div className="relative flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-white shadow-2xl ring-4 ring-brand-400">
                {getIcon()}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-6">
            <p className="inline-block rounded-lg bg-brand-50 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-brand-700">{getLabel()}</p>
            <h2 className="mt-4 text-4xl font-black text-main tracking-tight">{title}</h2>
            {content && (
              <div className="mt-6 rounded-2xl bg-brand-50 p-5 border-2 border-brand-100">
                <p className="text-lg font-bold text-brand-900 leading-relaxed">{content}</p>
              </div>
            )}
          </div>

          <div className="relative z-10 mt-10 flex flex-col gap-3">
            <button 
              onClick={handleClose}
              className="w-full rounded-[1.25rem] bg-brand-600 py-5 text-xl font-black text-white shadow-[0_6px_0_#065f46] transition-all hover:translate-y-[-2px] hover:shadow-[0_8px_0_#065f46] active:translate-y-[2px] active:shadow-none"
            >
              太棒了，立即查看！
            </button>
          </div>
        </div>
        
        {/* Animated Background Decoration */}
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-500/5 blur-3xl" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-coral-500/5 blur-3xl" />
      </div>
    </div>,
    document.body
  );
}
