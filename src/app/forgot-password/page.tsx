"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Mail, Loader2, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [devUrl, setDevUrl] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setSent(true);
      setEmailSent(!!data.emailSent);
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="忘記密碼" subtitle="輸入註冊 Email，我們協助你重設密碼">
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <MailCheck size={40} className="text-brand-500" />
          {emailSent ? (
            <p className="text-sm text-main">
              若此 Email 已註冊，我們已寄出一封重設密碼信件到 <b>{email}</b>，請至信箱查收（也請檢查垃圾郵件匣）。
            </p>
          ) : (
            <>
              <p className="text-sm text-main">若此 Email 存在，重設連結已經產生。</p>
              {devUrl && (
                <Link href={devUrl} className="btn-brand w-full rounded-xl py-2.5 text-center text-sm font-bold">
                  前往重設密碼
                </Link>
              )}
              <p className="text-xs text-soft">（尚未設定信件服務，暫以連結直接提供）</p>
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-soft">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
              <Mail size={16} className="text-soft" />
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-main outline-none" placeholder="you@example.com" />
            </div>
          </label>
          <button disabled={loading} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold">
            {loading && <Loader2 size={16} className="animate-spin" />} 送出重設連結
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-soft">
        想起密碼了？ <Link href="/login" className="font-bold text-brand-600 hover:underline">返回登入</Link>
      </p>
    </AuthCard>
  );
}