"use client";

import { useEffect, useState } from "react";
import { Check, Gift, PartyPopper, Sparkles, X } from "lucide-react";
import confetti from "canvas-confetti";
import { JCoin } from "@/components/j-coin";
import { cn } from "@/lib/utils";

export type CelebrationKind = "login" | "jcoins" | "join" | "gift" | "shop";

export interface CelebrationDetail {
  kind: CelebrationKind;
  title: string;
  description?: string;
  amount?: number;
}

export function announceCelebration(detail: CelebrationDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<CelebrationDetail>("joinjoy:celebration", { detail }));
}

interface CelebrationFeedbackProps {
  kind: CelebrationKind;
  title: string;
  description?: string;
  amount?: number;
  onClose: () => void;
  autoCloseMs?: number;
}

const celebrationCopy: Record<CelebrationKind, { icon: "login" | "jcoins" | "join" | "gift"; accent: string }> = {
  login: { icon: "login", accent: "brand" },
  jcoins: { icon: "jcoins", accent: "amber" },
  join: { icon: "join", accent: "coral" },
  gift: { icon: "gift", accent: "coral" },
  shop: { icon: "gift", accent: "brand" },
};

function CelebrationIcon({ kind }: { kind: CelebrationKind }) {
  switch (celebrationCopy[kind].icon) {
    case "login":
      return <PartyPopper className="text-brand-600" size={34} strokeWidth={2.5} />;
    case "jcoins":
      return <JCoin size={46} animate />;
    case "join":
      return <Check className="text-coral-600" size={38} strokeWidth={3} />;
    default:
      return <Gift className="text-coral-600" size={36} strokeWidth={2.5} />;
  }
}

export function CelebrationFeedback({
  kind,
  title,
  description,
  amount,
  onClose,
  autoCloseMs = 3600,
}: CelebrationFeedbackProps) {
  const [visible, setVisible] = useState(false);
  const accent = celebrationCopy[kind].accent;

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const enterTimer = window.setTimeout(() => setVisible(true), 16);
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onClose, reducedMotion ? 0 : 220);
    }, autoCloseMs);

    if (!reducedMotion) {
      try {
        confetti({
          particleCount: kind === "jcoins" ? 34 : 44,
          spread: 68,
          startVelocity: 24,
          scalar: 0.8,
          ticks: 90,
          origin: { x: 0.5, y: 0.22 },
          colors: kind === "jcoins"
            ? ["#f59e0b", "#fbbf24", "#f97316", "#ffffff"]
            : ["#159a84", "#f4775b", "#fbbf24", "#ffffff"],
        });
      } catch {
        // Confetti is decorative; a blocked canvas must never affect the action result.
      }
    }

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(closeTimer);
    };
  }, [autoCloseMs, kind, onClose]);

  function close() {
    setVisible(false);
    window.setTimeout(onClose, 220);
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[120] flex justify-center px-4" aria-live="polite">
      <div
        role="status"
        className={cn(
          "pointer-events-auto relative flex w-full max-w-sm items-center gap-3 rounded-2xl border-2 bg-white p-4 shadow-[0_18px_55px_rgba(20,67,56,0.2)] transition-all duration-300",
          visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-95 opacity-0",
          accent === "brand" && "border-brand-200",
          accent === "amber" && "border-amber-300",
          accent === "coral" && "border-coral-200",
        )}
      >
        <div
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
            accent === "brand" && "bg-brand-50",
            accent === "amber" && "bg-amber-50",
            accent === "coral" && "bg-coral-50",
          )}
        >
          <CelebrationIcon kind={kind} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-main">{title}</p>
          {description && <p className="mt-0.5 text-sm font-semibold leading-5 text-soft">{description}</p>}
          {kind === "jcoins" && typeof amount === "number" && (
            <p className="mt-1 flex items-center gap-1 text-sm font-black text-amber-600">
              <Sparkles size={14} /> +{amount} J 幣
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="關閉成功通知"
          className="self-start rounded-full p-1.5 text-soft transition hover:bg-app-soft hover:text-main"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );
}
