import React from "react";
import { Sparkles, Shield, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserHonorProps {
  name: string;
  role?: string | null;
  activeTitle?: string | null;
  activeBadge?: string | null;
  isHost?: boolean;
  className?: string;
  nameClassName?: string;
}

export function UserHonor({
  name,
  role,
  activeTitle,
  activeBadge,
  isHost,
  className,
  nameClassName,
}: UserHonorProps) {
  const isAdmin = role === "admin";
  const isSpecial = isAdmin || isHost;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
      {/* Name with Special Effects */}
      <span
        className={cn(
          "font-bold",
          isAdmin ? "animate-gold-glow" : isHost ? "text-coral-600 dark:text-coral-400" : "text-main",
          nameClassName
        )}
      >
        {name}
      </span>

      {/* Identity Badges */}
      {isAdmin && (
        <div className="flex items-center gap-1 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Shield className="h-3 w-3" />
          管理員
        </div>
      )}

      {isHost && !isAdmin && (
        <div className="flex items-center gap-1 rounded-full bg-coral-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Star className="h-3 w-3" />
          揪主
        </div>
      )}

      {/* AI Title with Particle Effect */}
      {activeTitle && (
        <div className="group relative flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50/50 px-2 py-0.5 text-[10px] font-black text-brand-600 backdrop-blur-sm transition-all hover:border-brand-400 hover:bg-brand-100/50 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400">
          <Sparkles className="h-2.5 w-2.5 text-brand-400" />
          {activeTitle}
          
          {/* Subtle Sparkle Animation */}
          <Sparkles className="absolute -right-1 -top-1 h-2 w-2 animate-pulse text-brand-400 opacity-0 group-hover:opacity-100" />
        </div>
      )}

      {/* Badge Icon */}
      {activeBadge && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cream-200 p-0.5 text-xs shadow-inner">
          {/* In a real app, this would be an image or dynamic icon */}
          🎖️
        </div>
      )}
    </div>
  );
}
