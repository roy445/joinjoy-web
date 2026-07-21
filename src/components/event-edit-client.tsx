"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ImagePlus } from "lucide-react";
import { REGIONS } from "@/lib/constants";
import { SectionTitle } from "@/components/ui";

export function EventEditClient({ id }: { id: string }) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/events/${id}`).then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); setLoading(false); return; }
      if (!d.isOwner && !d.isAdmin) { setError("您沒有權限編輯此活動"); setLoading(false); return; }
      const e = d.event;
      setForm({
        title: e.title, coverImageUrl: e.coverImageUrl, images: e.images || [], description: e.description,
        region: e.region || "台北市", eventDate: e.eventDate, startTime: e.startTime, endTime: e.endTime || "",
        meetingLocation: e.meetingLocation, mapAddress: e.mapAddress || "", capacity: String(e.capacity ?? ""), fee: String(e.fee ?? ""),
        contactInfo: e.contactInfo, notes: e.notes || "", requireApproval: e.requireApproval, allowWaitlist: e.allowWaitlist,
        ageMin: e.ageMin || "", ageMax: e.ageMax || "", genderLimit: e.genderLimit, allowPlusOne: e.allowPlusOne,
        isPrivate: e.isPrivate, tags: e.tags || [],
      });
      setLoading(false);
    });
  }, [id]);

  async function handleUpload(file: File, cover: boolean) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      if (cover) setForm((f: any) => ({ ...f, coverImageUrl: d.url }));
      else setForm((f: any) => ({ ...f, images: [...f.images, d.url].slice(0, 9) }));
    } finally { setUploading(false); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.capacity || Number(form.capacity) < 1) {
      setError("請輸入名額上限");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), fee: form.fee ? Number(form.fee) : 0 };
      const res = await fetch(`/api/events/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { setError(d.error); return; }
      router.push(`/events/${id}`);
    } finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (error && !form) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-soft">{error}</div>;
  if (!form) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="EDIT" title="編輯活動" />
      <form onSubmit={submit} className="flex flex-col gap-6">
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="card-surface flex flex-col gap-4 rounded-3xl p-5 md:p-6">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">封面圖片</span>
            <div className="relative">
              <img src={form.coverImageUrl} alt="" className="h-48 w-full rounded-2xl object-cover" />
              <label className="btn-brand absolute bottom-2 right-2 flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold">
                <ImagePlus size={14} /> 更換
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], true)} />
              </label>
            </div>
          </label>

          <Field label="活動名稱" required><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" /></Field>
          <Field label="活動介紹" required><textarea required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" /></Field>
        </div>

        <div className="card-surface flex flex-col gap-4 rounded-3xl p-5 md:p-6">
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
          <Field label="集合地點" required><input required value={form.meetingLocation} onChange={(e) => setForm({ ...form, meetingLocation: e.target.value })} className="input" /></Field>
          <Field label="Google 地圖位置"><input value={form.mapAddress} onChange={(e) => setForm({ ...form, mapAddress: e.target.value })} className="input" /></Field>
        </div>

        <div className="card-surface flex flex-col gap-4 rounded-3xl p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="名額上限" required>
              <input required type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} className="input" placeholder="例如：10" />
            </Field>
            <Field label="費用（NT$）">
              <input type="number" min={0} value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} className="input" placeholder="留空表示免費" />
            </Field>
          </div>
          <Field label="聯絡方式" required><input required value={form.contactInfo} onChange={(e) => setForm({ ...form, contactInfo: e.target.value })} className="input" /></Field>
          <Field label="注意事項"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" /></Field>
        </div>

        <button disabled={saving || uploading} type="submit" className="btn-coral flex items-center justify-center gap-2 rounded-full py-3.5 text-base font-bold disabled:opacity-50">
          {saving && <Loader2 size={18} className="animate-spin" />} 儲存變更
        </button>
      </form>

      <style jsx global>{`
        .input { width: 100%; border-radius: 12px; border: 1px solid var(--color-border); background: var(--color-bg); padding: 0.65rem 0.9rem; font-size: 0.875rem; color: var(--color-text); outline: none; }
      `}</style>
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