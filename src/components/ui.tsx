import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-500">{eyebrow}</p>}
        <h2 className="font-display text-xl font-bold text-main md:text-2xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon = "🌱", title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--color-border)] bg-app-soft py-14 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="font-semibold text-main">{title}</p>
      {subtitle && <p className="text-sm text-soft">{subtitle}</p>}
    </div>
  );
}

export function Badge({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "coral" | "gray" | "rose" }) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
    coral: "bg-coral-500/10 text-coral-600",
    gray: "bg-gray-500/10 text-gray-500",
    rose: "bg-rose-500/10 text-rose-500",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold", tones[tone])}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function CreditBadge({ score }: { score: number | string }) {
  const num = Number(score);
  const tone = num >= 90 ? "brand" : num >= 70 ? "coral" : "rose";
  return <Badge tone={tone}>💳 信用 {num.toFixed(0)}</Badge>;
}

export function BlacklistBadge() {
  return <Badge tone="rose">⚠️ 黑名單使用者</Badge>;
}
