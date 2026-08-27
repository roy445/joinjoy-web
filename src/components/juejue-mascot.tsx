"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type JueJueState = "idle" | "listening" | "thinking" | "success" | "searching" | "loading" | "active";

interface JueJueMascotProps {
  state?: JueJueState;
  size?: number;
  className?: string;
  showGlow?: boolean;
}

/**
 * JueJue Mascot Component
 * Displays the AI mascot with different expressions based on state
 */
export function JueJueMascot({
  state = "idle",
  size = 64,
  className,
  showGlow = true,
}: JueJueMascotProps) {
  // Mapping states to sprite positions (based on expressions.webp which has 6 expressions in 3x2 grid)
  // 1: Listening, 2: Thinking, 3: Success
  // 4: Searching, 5: Loading, 6: Active/Glow
  const getSpriteStyle = () => {
    let x = 0;
    let y = 0;

    switch (state) {
      case "listening": x = 0; y = 0; break;
      case "thinking": x = 1; y = 0; break;
      case "success": x = 2; y = 0; break;
      case "searching": x = 0; y = 1; break;
      case "loading": x = 1; y = 1; break;
      case "active": x = 2; y = 1; break;
      case "idle": default: x = 2; y = 1; break; // Use active as idle
    }

    return {
      backgroundImage: "url('/images/juejue/expressions.webp')",
      backgroundSize: "300% 200%",
      backgroundPosition: `${x * 50}% ${y * 100}%`,
      width: size,
      height: size,
    };
  };

  return (
    <div 
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full transition-all duration-300",
        showGlow && state !== "idle" && "ring-4 ring-brand-500/20 shadow-[0_0_20px_rgba(var(--brand-500-rgb),0.3)]",
        className
      )}
      style={{ width: size, height: size }}
    >
      {state === "idle" ? (
        <img 
          src="/images/juejue/mascot.png" 
          alt="JueJue" 
          className="h-full w-full object-contain"
        />
      ) : (
        <div style={getSpriteStyle()} className="bg-no-repeat" />
      )}
      
      {/* Animation Overlays */}
      {state === "thinking" && (
        <div className="absolute inset-0 animate-pulse bg-brand-500/5" />
      )}
      {state === "loading" && (
        <div className="absolute inset-0 animate-spin-slow opacity-20">
           <div className="h-full w-full rounded-full border-2 border-dashed border-brand-500" />
        </div>
      )}
    </div>
  );
}
