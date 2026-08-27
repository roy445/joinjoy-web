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
    
    // Fire confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

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
          "w-full max-w-md pointer-events-auto overflow-hidden rounded-3xl bg-app shadow-[0_0_50px_rgba(var(--brand-500-rgb),0.2)] border-2 border-brand-500/20 transition-all duration-500 transform",
          visible ? "scale-100 opacity-100 translate-y-0" : "scale-90 opacity-0 translate-y-10"
        )}
      >
        <div className="relative p-8 text-center">
          <button 
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-2 text-soft hover:bg-app-soft transition-colors"
          >
            <X size={20} />
          </button>

          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/20" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-app-soft shadow-inner">
                {getIcon()}
              </div>
            </div>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{getLabel()}</p>
          <h2 className="mt-2 text-3xl font-black text-main">{title}</h2>
          {content && <p className="mt-4 text-soft">{content}</p>}

          <div className="mt-8 flex flex-col gap-3">
            <button 
              onClick={handleClose}
              className="btn-brand w-full rounded-2xl py-4 text-sm font-bold shadow-lg shadow-brand-500/20"
            >
              太棒了！
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
