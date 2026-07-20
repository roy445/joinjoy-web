"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="切換深色/淺色模式"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-app-soft text-main transition hover:scale-105 hover:text-brand-600"
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
