"use client";

import { useState } from "react";
import Link from "next/link";
import { MailWarning, Loader2, X } from "lucide-react";

export function EmailVerifyBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (dismissed) return null;

  async function resend() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const d = await res.json();
      if (res.ok) {
        if (d.devVerifyUrl) {
          setMessage("尚未設定信件服務，請點選下方連結完成驗證");
        } else {
          setMessage("驗證信已重新寄出，請至信箱查收！");
        }
      } else {
        setMessage(d.error || "發送失敗，請稍後再試");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-300/50 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
      <MailWarning size={16} className="shrink-0" />
      <span className="flex-1 min-w-[200px]">
        您的信箱 <b>{email}</b> 尚未完成驗證{message ? `： ${message}` : "，部分功能可能受限。"}
      </span>
      <button disabled={loading} onClick={resend} className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
        {loading && <Loader2 size={12} className="animate-spin" />} 重新發送驗證信
      </button>
      <button onClick={() => setDismissed(true)} className="rounded-full p-1 text-amber-600 hover:bg-amber-500/10">
        <X size={14} />
      </button>
    </div>
  );
}