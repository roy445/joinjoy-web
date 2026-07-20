"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { Lock, Loader2 } from "lucide-react";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("兩次密碼輸入不一致");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "重設失敗");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="重設密碼" subtitle="請輸入新密碼">
      {done ? (
        <p className="text-center text-sm text-brand-600">密碼已重設成功，正在前往登入頁...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-soft">新密碼</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
              <Lock size={16} className="text-soft" />
              <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-main outline-none" />
            </div>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-soft">確認新密碼</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
              <Lock size={16} className="text-soft" />
              <input required type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-transparent text-sm text-main outline-none" />
            </div>
          </label>
          <button disabled={loading} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold">
            {loading && <Loader2 size={16} className="animate-spin" />} 更新密碼
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-soft">
        <Link href="/login" className="font-bold text-brand-600 hover:underline">返回登入</Link>
      </p>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
