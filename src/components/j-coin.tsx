import React from "react";
import { cn } from "@/lib/utils";

interface JCoinProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export function JCoin({ size = 16, className, animate = true }: JCoinProps) {
  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        animate && "hover:scale-110 transition-transform duration-300",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src="/images/j-coin-transparent.png"
        alt="J-Coin"
        className={cn(
          "h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)]",
          animate && "drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
        )}
      />
      {animate && (
        <div className="absolute inset-0 animate-pulse rounded-full bg-amber-400/10 blur-[2px]" />
      )}
    </div>
  );
}
