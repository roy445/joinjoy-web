import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-cream-50 to-coral-50 px-4 py-10 dark:from-[#10161a] dark:via-[#141b1f] dark:to-[#171216]">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 animate-float rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-72 w-72 animate-float rounded-full bg-coral-200/40 blur-3xl" style={{ animationDelay: "1.5s" }} />

      <div className="glass animate-fade-up relative w-full max-w-md rounded-[28px] p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo size={52} showText={false} />
          <div>
            <h1 className="font-display text-2xl font-bold text-main">{title}</h1>
            <p className="mt-1 text-sm text-soft">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
