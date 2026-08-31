"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { Mail, Lock, Loader2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "登入失敗");
        return;
      }
      if (data.warning) {
        router.push("/settings");
        router.refresh();
        return;
      }
      router.push("/?welcome=1");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="歡迎回來" subtitle="登入揪好咖，繼續你的下一場相聚">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">Email</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <Mail size={16} className="text-soft" />
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent text-sm text-main outline-none" placeholder="you@example.com" />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">密碼</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <Lock size={16} className="text-soft" />
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent text-sm text-main outline-none" placeholder="••••••••" />
          </div>
        </label>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">忘記密碼？</Link>
        </div>
        <button disabled={loading} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold">
          {loading && <Loader2 size={16} className="animate-spin" />} 登入
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-soft">
        還沒有帳號？ <Link href="/register" className="font-bold text-brand-600 hover:underline">立即註冊</Link>
      </p>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
