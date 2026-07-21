"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus, KeyRound, Send, CheckCircle2, BookOpenCheck } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import { GroupGuidelinesModal } from "@/components/group-guidelines-modal";

type Permission = { canCreateGroup: boolean; credits: number; isAdmin: boolean; hasAgreedGroupGuidelines: boolean };

export default function CreateGroupPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/groups/permission").then((r) => (r.ok ? r.json() : null)),
    ]).then(([meData, perm]) => {
      setMe(meData.user);
      if (perm) setPermission(perm);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-soft"><Loader2 className="mx-auto animate-spin" /></div>;

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-main">請先登入才能建立社團</p>
        <a href="/login" className="btn-brand mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-bold">前往登入</a>
      </div>
    );
  }

  const hasPermission = permission?.isAdmin || permission?.canCreateGroup || (permission?.credits ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="CREATE" title="建立社團" />

      {!permission?.hasAgreedGroupGuidelines ? (
        <div className="card-surface animate-fade-up rounded-3xl p-6 text-center md:p-8">
          <p className="text-2xl">👥</p>
          <h3 className="mt-2 font-display text-lg font-bold text-main">建立社團前，請先詳閱社團規則</h3>
          <p className="mt-1 text-sm text-soft">包含成員審核責任、社團專屬活動機制、違規處理方式，僅需閱讀同意一次。</p>
          <button onClick={() => setShowGuidelines(true)} className="btn-coral mx-auto mt-4 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold">
            <BookOpenCheck size={16} /> 閱讀社團規則
          </button>
        </div>
      ) : hasPermission ? (
        <GroupForm credits={permission?.credits ?? 0} isAdmin={!!permission?.isAdmin} />
      ) : (
        <PermissionGate onGranted={() => setPermission({ ...(permission as Permission), credits: (permission?.credits ?? 0) + 1 })} />
      )}

      {showGuidelines && (
        <GroupGuidelinesModal
          onAgree={() => {
            setShowGuidelines(false);
            setPermission((p) => (p ? { ...p, hasAgreedGroupGuidelines: true } : p));
          }}
          onClose={() => setShowGuidelines(false)}
        />
      )}
    </div>
  );
}

function PermissionGate({ onGranted }: { onGranted: () => void }) {
  const [mode, setMode] = useState<"code" | "request">("code");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/groups/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok) { setMessage(d.message); onGranted(); } else setError(d.error);
    } finally { setLoading(false); }
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/groups/create-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const d = await res.json();
      if (res.ok) setRequestSent(true); else setError(d.error);
    } finally { setLoading(false); }
  }

  return (
    <div className="card-surface animate-fade-up rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-coral-50 p-4 text-sm text-coral-700 dark:bg-coral-500/10">
        <KeyRound className="mt-0.5 shrink-0" size={20} />
        <p>為了避免濫用，建立社團前需要先通過驗證。請選擇以下其中一種方式：</p>
      </div>

      <div className="mb-5 flex gap-2 rounded-full bg-app-soft p-1">
        <button onClick={() => setMode("code")} className={`flex-1 rounded-full py-2 text-sm font-bold ${mode === "code" ? "bg-brand-500 text-white" : "text-soft"}`}>輸入一次性代碼</button>
        <button onClick={() => setMode("request")} className={`flex-1 rounded-full py-2 text-sm font-bold ${mode === "request" ? "bg-brand-500 text-white" : "text-soft"}`}>申請管理員審核</button>
      </div>

      {error && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
      {message && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <CheckCircle2 size={16} /> {message}
        </div>
      )}

      {mode === "code" ? (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">一次性代碼</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="例如：JOINJOY-XXXXXXXX" className="w-full rounded-xl border border-[var(--color-border)] bg-app px-4 py-3 text-sm uppercase tracking-wider text-main outline-none" />
          </label>
          <p className="text-xs text-soft">請向管理員索取社團專用一次性代碼，驗證成功後立即失效並取得 1 次建立社團的權限。</p>
          <button disabled={loading || !code} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 驗證代碼
          </button>
        </form>
      ) : requestSent ? (
        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
          申請已送出！管理員審核通過後，您將收到通知並獲得 1 次建立社團的權限，請耐心等候。
        </div>
      ) : (
        <form onSubmit={sendRequest} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">申請原因 / 社團構想簡述</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="請簡述你想建立的社團主題與用途，幫助管理員審核" className="w-full rounded-xl border border-[var(--color-border)] bg-app px-4 py-3 text-sm text-main outline-none" />
          </label>
          <button disabled={loading || reason.length < 5} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} <Send size={14} /> 送出申請
          </button>
        </form>
      )}
    </div>
  );
}

function GroupForm({ credits, isAdmin }: { credits: number; isAdmin: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", coverImageUrl: "", isPrivate: true });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      setForm((f) => ({ ...f, coverImageUrl: d.url }));
    } finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      router.push(`/groups/${d.group.id}`);
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {!isAdmin && (
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-500/10">
          您目前擁有 <b>{credits}</b> 次建立社團的權限，本次建立將會使用 1 次。
        </div>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="card-surface flex flex-col gap-4 rounded-3xl p-5 md:p-6">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">社團封面圖片</span>
          {form.coverImageUrl ? (
            <div className="relative">
              <img src={form.coverImageUrl} alt="" className="h-40 w-full rounded-2xl object-cover" />
              <button type="button" onClick={() => setForm({ ...form, coverImageUrl: "" })} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">移除</button>
            </div>
          ) : (
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-soft">
              <ImagePlus size={22} /> <span className="text-xs">{uploading ? "上傳中..." : "點擊上傳封面圖片"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
            </label>
          )}
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold text-soft">社團名稱 <span className="text-rose-500">*</span></span>
          <input required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="例如：週末登山揪團社" />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-xs font-semibold text-soft">社團介紹 <span className="text-rose-500">*</span></span>
          <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="介紹社團的主題、氛圍與招募對象..." />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold text-soft">加入方式</span>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm({ ...form, isPrivate: true })} className={`rounded-2xl border p-3 text-center text-xs font-semibold transition ${form.isPrivate ? "border-brand-500 bg-brand-500/10 text-brand-700" : "border-[var(--color-border)] text-soft"}`}>
              🔒 私人社團<br /><span className="font-normal">需審核才能加入</span>
            </button>
            <button type="button" onClick={() => setForm({ ...form, isPrivate: false })} className={`rounded-2xl border p-3 text-center text-xs font-semibold transition ${!form.isPrivate ? "border-brand-500 bg-brand-500/10 text-brand-700" : "border-[var(--color-border)] text-soft"}`}>
              🌐 公開社團<br /><span className="font-normal">仍會顯示於社團列表</span>
            </button>
          </div>
        </div>
      </div>

      <button disabled={submitting || uploading} type="submit" className="btn-coral flex items-center justify-center gap-2 rounded-full py-3.5 text-base font-bold disabled:opacity-50">
        {submitting && <Loader2 size={18} className="animate-spin" />} 建立社團
      </button>

      <style jsx global>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--color-border); background: var(--color-bg); padding: 0.65rem 0.9rem; font-size: 0.875rem; color: var(--color-text); outline: none; }
      `}</style>
    </form>
  );
}