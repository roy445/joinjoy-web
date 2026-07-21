"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("缺少驗證碼，請確認信件中的連結是否完整");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(d.error || "驗證失敗");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("驗證時發生錯誤，請稍後再試");
      });
  }, [token]);

  return (
    <AuthCard title="Email 驗證" subtitle="確認你的帳號信箱">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {status === "loading" && (
          <>
            <Loader2 size={40} className="animate-spin text-brand-500" />
            <p className="text-sm text-soft">正在驗證你的信箱，請稍候...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 size={44} className="text-brand-500" />
            <p className="font-display text-lg font-bold text-main">信箱驗證成功！</p>
            <p className="text-sm text-soft">你的帳號已完成驗證，感謝加入揪好咖 🎉</p>
            <Link href="/" className="btn-brand mt-2 rounded-full px-6 py-2.5 text-sm font-bold">回到首頁</Link>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle size={44} className="text-rose-500" />
            <p className="font-display text-lg font-bold text-main">驗證失敗</p>
            <p className="text-sm text-soft">{message}</p>
            <Link href="/settings" className="btn-brand mt-2 rounded-full px-6 py-2.5 text-sm font-bold">前往個人設定重新發送</Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}