"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { GuidelinesModal } from "@/components/guidelines-modal";
import { Mail, Lock, User, Loader2, BookOpenCheck, CheckCircle2, MailCheck } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  function handleAgree() {
    setAgree(true);
    setShowGuidelines(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("兩次密碼輸入不一致");
      return;
    }
    if (!agree) {
      setError("請先詳閱並同意社群公約，才能完成註冊");
      setShowGuidelines(true);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "註冊失敗");
        return;
      }
      setRegistered(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <AuthCard title="註冊成功！" subtitle="歡迎加入揪好咖">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <MailCheck size={44} className="text-brand-500" />
          <p className="text-sm text-soft">帳號已建立，您已成功登入，現在可以開始探索揪好咖的活動與社群。</p>
          <Link href="/" className="btn-coral mt-2 w-full rounded-xl py-2.5 text-center text-sm font-bold">
            開始使用
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="加入揪好咖" subtitle="打造你的第一場活動，或找到志同道合的夥伴">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="rounded-xl bg-coral-50 px-3 py-2 text-sm text-coral-600">{error}</p>}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">暱稱</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <User size={16} className="text-soft" />
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-transparent text-sm text-main outline-none" placeholder="你的暱稱" maxLength={50} />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">Email</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <Mail size={16} className="text-soft" />
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-transparent text-sm text-main outline-none" placeholder="you@example.com" />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">密碼（至少 8 碼）</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <Lock size={16} className="text-soft" />
            <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-transparent text-sm text-main outline-none" placeholder="••••••••" />
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-soft">確認密碼</span>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5">
            <Lock size={16} className="text-soft" />
            <input required type="password" minLength={8} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="w-full bg-transparent text-sm text-main outline-none" placeholder="••••••••" />
          </div>
        </label>

        <button
          type="button"
          onClick={() => setShowGuidelines(true)}
          className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold transition ${
            agree ? "border-brand-300 bg-brand-500/10 text-brand-700" : "border-coral-300 bg-coral-500/10 text-coral-600 animate-pulse"
          }`}
        >
          <span className="flex items-center gap-2">
            {agree ? <CheckCircle2 size={16} /> : <BookOpenCheck size={16} />}
            {agree ? "已閱讀並同意社群公約" : "點此詳閱社群公約（註冊必讀）"}
          </span>
          {!agree && <span className="text-xs font-bold">必讀 →</span>}
        </button>

        <button disabled={loading || !agree} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40">
          {loading && <Loader2 size={16} className="animate-spin" />} 建立帳號
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-soft">
        已經有帳號？ <Link href="/login" className="font-bold text-brand-600 hover:underline">直接登入</Link>
      </p>

      {showGuidelines && <GuidelinesModal onAgree={handleAgree} onClose={() => setShowGuidelines(false)} />}
    </AuthCard>
  );
}