"use client";

import { useState } from "react";
import { Loader2, ShieldQuestion, X } from "lucide-react";

export function AppealModal({ type, onClose, onSubmitted }: { type: "suspend" | "blacklist"; onClose: () => void; onSubmitted: () => void }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error);
        return;
      }
      onSubmitted();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="glass w-full max-w-md animate-pop rounded-3xl p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-main">
            <ShieldQuestion size={20} className="text-coral-500" /> 提出帳號申訴
          </h3>
          <button onClick={onClose}><X size={18} className="text-soft" /></button>
        </div>
        <p className="text-xs text-soft">
          請說明您認為此處分不合理的原因，管理員將重新審核您的帳號紀錄。惡意濫用申訴功能可能導致帳號受到更嚴重的處分。
        </p>
        {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="請詳細描述事情經過與您的申訴理由（至少 10 個字）"
          className="mt-3 w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none"
        />
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border)] py-2.5 text-sm font-bold text-main">取消</button>
          <button disabled={loading || message.length < 10} onClick={submit} className="btn-coral flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 送出申訴
          </button>
        </div>
      </div>
    </div>
  );
}
