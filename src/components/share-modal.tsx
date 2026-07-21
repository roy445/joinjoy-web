"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Share2, MessageCircle } from "lucide-react";

export function ShareModal({ title, onClose }: { title: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard failures (e.g. insecure context)
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        onClose();
      } catch {
        // user cancelled — no-op
      }
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareTargets = [
    {
      label: "LINE",
      icon: "💬",
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
      color: "bg-[#06C755]/10 text-[#06C755]",
    },
    {
      label: "Facebook",
      icon: "📘",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-[#1877F2]/10 text-[#1877F2]",
    },
    {
      label: "X",
      icon: "𝕏",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: "bg-black/10 text-black dark:text-white",
    },
    {
      label: "Email",
      icon: "✉️",
      href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
      color: "bg-brand-500/10 text-brand-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="glass w-full max-w-sm animate-pop rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-main">
            <Share2 size={18} className="text-brand-600" /> 分享活動
          </h3>
          <button onClick={onClose} className="rounded-full p-1 text-soft hover:text-coral-500"><X size={18} /></button>
        </div>

        <p className="mb-2 truncate text-sm font-semibold text-main">{title}</p>

        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
          <span className="flex-1 truncate text-xs text-soft">{url}</span>
          <button onClick={copyLink} className="btn-brand flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "已複製" : "複製連結"}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {shareTargets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition hover:-translate-y-0.5"
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg ${t.color}`}>{t.icon}</span>
              <span className="text-[11px] font-semibold text-soft">{t.label}</span>
            </a>
          ))}
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <button onClick={nativeShare} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">
            <MessageCircle size={16} /> 使用系統分享功能
          </button>
        )}
      </div>
    </div>
  );
}