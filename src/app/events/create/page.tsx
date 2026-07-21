"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus, KeyRound, Send, CheckCircle2, BookOpenCheck } from "lucide-react";
import { REGIONS } from "@/lib/constants";
import { SectionTitle } from "@/components/ui";
import { HostGuidelinesModal } from "@/components/host-guidelines-modal";

type Permission = { canCreateEvent: boolean; credits: number; isAdmin: boolean; hasAgreedHostGuidelines: boolean };

export default function CreateEventPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [permission, setPermission] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/my-events").then((r) => (r.ok ? r.json() : null)),
    ]).then(([meData, myEvents]) => {
      setMe(meData.user);
      if (myEvents) setPermission(myEvents.createPermission);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-soft"><Loader2 className="mx-auto animate-spin" /></div>;

  if (!me) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-main">請先登入才能建立活動</p>
        <a href="/login" className="btn-brand mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-bold">前往登入</a>
      </div>
    );
  }

  const hasPermission = permission?.isAdmin || permission?.canCreateEvent || (permission?.credits ?? 0) > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="CREATE" title="建立活動" />

      {!permission?.hasAgreedHostGuidelines ? (
        <div className="card-surface animate-fade-up rounded-3xl p-6 text-center md:p-8">
          <p className="text-2xl">🎪</p>
          <h3 className="mt-2 font-display text-lg font-bold text-main">建立活動前，請先詳閱揪主守則</h3>
          <p className="mt-1 text-sm text-soft">包含取消活動須說明原因、活動開始前 24 小時鎖定編輯等重要規範，僅需閱讀同意一次。</p>
          <button
            onClick={() => setShowGuidelines(true)}
            className="btn-coral mx-auto mt-4 flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold"
          >
            <BookOpenCheck size={16} /> 閱讀揪主守則
          </button>
        </div>
      ) : hasPermission ? (
        <EventForm credits={permission?.credits ?? 0} isAdmin={!!permission?.isAdmin} />
      ) : (
        <PermissionGate onGranted={() => setPermission({ ...(permission as Permission), credits: (permission?.credits ?? 0) + 1 })} />
      )}

      {showGuidelines && (
        <HostGuidelinesModal
          onAgree={() => {
            setShowGuidelines(false);
            setPermission((p) => (p ? { ...p, hasAgreedHostGuidelines: true } : p));
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
      const res = await fetch("/api/events/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const d = await res.json();
      if (res.ok) { setMessage(d.message); onGranted(); } else setError(d.error);
    } finally { setLoading(false); }
  }

  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/events/create-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      const d = await res.json();
      if (res.ok) setRequestSent(true); else setError(d.error);
    } finally { setLoading(false); }
  }

  return (
    <div className="card-surface animate-fade-up rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-coral-50 p-4 text-sm text-coral-700 dark:bg-coral-500/10">
        <KeyRound className="mt-0.5 shrink-0" size={20} />
        <p>為了避免任何人隨意開團、維護活動品質，建立活動前需要先通過驗證。請選擇以下其中一種方式：</p>
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
          <p className="text-xs text-soft">請向管理員索取一次性代碼，每組代碼僅能使用一次，驗證成功後立即失效並取得 1 次建立活動的權限。</p>
          <button disabled={loading || !code} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} 驗證代碼
          </button>
        </form>
      ) : requestSent ? (
        <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
          申請已送出！管理員審核通過後，您將收到通知並獲得 1 次建立活動的權限，請耐心等候。
        </div>
      ) : (
        <form onSubmit={sendRequest} className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">申請原因 / 活動構想簡述</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="請簡述你想舉辦的活動內容，幫助管理員審核" className="w-full rounded-xl border border-[var(--color-border)] bg-app px-4 py-3 text-sm text-main outline-none" />
          </label>
          <button disabled={loading || reason.length < 5} type="submit" className="btn-brand flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-50">
            {loading && <Loader2 size={16} className="animate-spin" />} <Send size={14} /> 送出申請
          </button>
        </form>
      )}
    </div>
  );
}

const defaultForm = {
  title: "", coverImageUrl: "", images: [] as string[], description: "",
  region: "台北市", eventDate: "", startTime: "", endTime: "", meetingLocation: "", mapAddress: "",
  capacity: "", fee: "", contactInfo: "", notes: "",
  requireApproval: false, allowWaitlist: true, ageMin: "", ageMax: "", genderLimit: "any",
  allowPlusOne: false, isPrivate: false,
};

function EventForm({ credits, isAdmin }: { credits: number; isAdmin: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(file: File, cover: boolean) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      if (cover) setForm((f) => ({ ...f, coverImageUrl: d.url }));
      else setForm((f) => ({ ...f, images: [...f.images, d.url].slice(0, 9) }));
    } finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.capacity || Number(form.capacity) < 1) {
      setError("請輸入名額上限");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), fee: form.fee ? Number(form.fee) : 0 };
      const res = await fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      router.push(`/events/${d.event.id}`);
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {!isAdmin && (
        <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700 dark:bg-brand-500/10">
          您目前擁有 <b>{credits}</b> 次建立活動的權限，本次建立將會使用 1 次。
        </div>
      )}
      {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <FormSection title="封面與基本資訊">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">封面圖片 <span className="text-rose-500">*</span></span>
          {form.coverImageUrl ? (
            <div className="relative">
              <img src={form.coverImageUrl} alt="" className="h-48 w-full rounded-2xl object-cover" />
              <button type="button" onClick={() => setForm({ ...form, coverImageUrl: "" })} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">移除</button>
            </div>
          ) : (
            <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-soft">
              <ImagePlus size={24} /> <span className="text-xs">{uploading ? "上傳中..." : "點擊上傳封面圖片"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], true)} />
            </label>
          )}
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">額外活動照片（最多 9 張）</span>
          <div className="flex flex-wrap gap-2">
            {form.images.map((img, i) => (
              <div key={i} className="relative h-20 w-20">
                <img src={img} alt="" className="h-20 w-20 rounded-xl object-cover" />
                <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })} className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1 text-[10px] text-white">✕</button>
              </div>
            ))}
            {form.images.length < 9 && (
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-border)] text-soft">
                <ImagePlus size={18} />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], false)} />
              </label>
            )}
          </div>
        </label>

        <Field label="活動名稱" required><input required maxLength={150} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>

        <Field label="活動介紹" required><textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="詳細描述活動內容、行程、適合對象..." /></Field>
      </FormSection>

      <FormSection title="時間與地點">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="活動日期" required><input required type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} className="input" /></Field>
          <Field label="開始時間" required><input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="input" /></Field>
          <Field label="結束時間"><input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="input" /></Field>
        </div>
        <Field label="地區">
          <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="input">
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="集合地點" required><input required value={form.meetingLocation} onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })} className="input" placeholder="例如：捷運市政府站 3 號出口" /></Field>
        <Field label="Google 地圖位置（地址或地標名稱）"><input value={form.mapAddress} onChange={(e) => setForm({ ...form, mapAddress: e.target.value })} className="input" placeholder="用於產生地圖預覽，例如：台北 101" /></Field>
      </FormSection>

      <FormSection title="名額與費用">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="名額上限" required>
            <input
              required
              type="number"
              min={1}
              max={1000}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="input"
              placeholder="例如：10"
            />
          </Field>
          <Field label="費用（NT$）">
            <input
              type="number"
              min={0}
              value={form.fee}
              onChange={(e) => setForm({ ...form, fee: e.target.value })}
              className="input"
              placeholder="留空表示免費"
            />
          </Field>
        </div>
        <Field label="聯絡方式" required><input required value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} className="input" placeholder="LINE ID / 電話 / Email" /></Field>
        <Field label="注意事項"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" placeholder="裝備需求、取消規則..." /></Field>
      </FormSection>

      <FormSection title="報名條件與隱私設定">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="性別限制">
            <select value={form.genderLimit} onChange={(e) => setForm({ ...form, genderLimit: e.target.value })} className="input">
              <option value="any">不限</option><option value="male">限男性</option><option value="female">限女性</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="最小年齡"><input type="number" value={form.ageMin} onChange={(e) => setForm({ ...form, ageMin: e.target.value })} className="input" /></Field>
            <Field label="最大年齡"><input type="number" value={form.ageMax} onChange={(e) => setForm({ ...form, ageMax: e.target.value })} className="input" /></Field>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ToggleField label="需要審核加入" checked={form.requireApproval} onChange={(v) => setForm({ ...form, requireApproval: v })} />
          <ToggleField label="允許候補" checked={form.allowWaitlist} onChange={(v) => setForm({ ...form, allowWaitlist: v })} />
          <ToggleField label="允許攜伴" checked={form.allowPlusOne} onChange={(v) => setForm({ ...form, allowPlusOne: v })} />
          <ToggleField label="私人活動" checked={form.isPrivate} onChange={(v) => setForm({ ...form, isPrivate: v })} />
        </div>
      </FormSection>

      <button disabled={submitting || uploading} type="submit" className="btn-coral flex items-center justify-center gap-2 rounded-full py-3.5 text-base font-bold disabled:opacity-50">
        {submitting && <Loader2 size={18} className="animate-spin" />} 發布活動
      </button>

      <style jsx global>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--color-border); background: var(--color-bg); padding: 0.65rem 0.9rem; font-size: 0.875rem; color: var(--color-text); outline: none; }
      `}</style>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-surface flex flex-col gap-4 rounded-3xl p-5 md:p-6">
      <h3 className="font-display font-bold text-main">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-semibold text-soft">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center text-xs font-semibold transition ${checked ? "border-brand-500 bg-brand-500/10 text-brand-700" : "border-[var(--color-border)] text-soft"}`}>
      <span className="text-lg">{checked ? "✅" : "⬜"}</span>
      {label}
    </button>
  );
}