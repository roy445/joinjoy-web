"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionTitle, Badge } from "@/components/ui";
import { AppealModal } from "@/components/appeal-modal";
import {
  ImagePlus, Loader2, Save, KeyRound, ShieldAlert, ShieldQuestion,
  Bell, CalendarCheck, Bookmark, PlusCircle, ShieldCheck, Clock,
} from "lucide-react";
import { EVENT_TAGS } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: "", bio: "", avatarUrl: "", interests: [] as string[], gender: "", age: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [showAppealModal, setShowAppealModal] = useState<"suspend" | "blacklist" | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  function loadUser() {
    fetch("/api/users/me").then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setUser(d.user);
      setForm({
        name: d.user.name || "",
        bio: d.user.bio || "",
        avatarUrl: d.user.avatarUrl || "",
        interests: d.user.interests || [],
        gender: d.user.gender || "",
        age: d.user.age ? String(d.user.age) : "",
      });
    });
  }
  function loadAppeals() {
    fetch("/api/appeals").then((r) => (r.ok ? r.json() : { appeals: [] })).then((d) => setAppeals(d.appeals || []));
  }
  useEffect(() => {
    loadUser();
    loadAppeals();
  }, []);

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) setForm((f) => ({ ...f, avatarUrl: d.url }));
      else setMessage(d.error);
    } finally {
      setUploading(false);
    }
  }

  function toggleInterest(tag: string) {
    setForm((f) => ({ ...f, interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag] }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, gender: form.gender || null, age: form.age ? Number(form.age) : null }),
      });
      const d = await res.json();
      if (res.ok) setMessage("已儲存變更！");
      else setMessage(d.error);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwError("");
    setPwMessage("");
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("兩次輸入的新密碼不一致");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const d = await res.json();
      if (res.ok) {
        setPwMessage("密碼已成功更新！其他裝置的登入狀態已被登出。");
        setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      } else {
        setPwError(d.error);
      }
    } finally {
      setPwSaving(false);
    }
  }

  if (!user) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-soft">請先登入以查看個人設定</div>;

  const latestAppeal = appeals[0];
  const appealPending = latestAppeal?.status === "pending";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="SETTINGS" title="個人設定" />

      {message && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p>}

      {/* Account status / appeal center */}
      {(user.status === "suspended" || user.isBlacklisted) && (
        <div className="card-surface animate-fade-up flex flex-col gap-3 rounded-3xl border-2 border-rose-300 bg-rose-50/60 p-5 dark:bg-rose-500/5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 shrink-0 text-rose-500" size={22} />
            <div>
              <h3 className="font-display font-bold text-rose-600">帳號目前受到限制</h3>
              {user.status === "suspended" && <p className="mt-1 text-sm text-rose-600">您的帳號已被停權：{user.suspendReason || "違反平台規範"}</p>}
              {user.isBlacklisted && <p className="mt-1 text-sm text-rose-600">您已被列入平台黑名單，未來報名活動將被標記且信用分數已降低。</p>}
            </div>
          </div>

          {appealPending ? (
            <div className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-sm text-main dark:bg-white/5">
              <Clock size={16} className="text-amber-500" /> 您的申訴正在審核中，請耐心等候管理員回覆。
            </div>
          ) : (
            <button
              onClick={() => setShowAppealModal(user.status === "suspended" ? "suspend" : "blacklist")}
              className="btn-coral flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold"
            >
              <ShieldQuestion size={16} /> 提出申訴
            </button>
          )}

          {appeals.length > 0 && (
            <div className="flex flex-col gap-1.5 border-t border-rose-200/60 pt-3">
              <p className="text-xs font-semibold text-soft">申訴紀錄</p>
              {appeals.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs text-soft">
                  <span>{timeAgo(a.createdAt)} · {a.type === "suspend" ? "停權申訴" : "黑名單申訴"}</span>
                  <Badge tone={a.status === "pending" ? "coral" : a.status === "resolved" ? "brand" : "gray"}>
                    {a.status === "pending" ? "審核中" : a.status === "resolved" ? "已核准" : "已駁回"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/notifications" icon={<Bell size={18} />} label="通知中心" />
        <QuickLink href="/my-events" icon={<CalendarCheck size={18} />} label="我的活動" />
        <QuickLink href="/favorites" icon={<Bookmark size={18} />} label="我的收藏" />
        <QuickLink href="/events/create" icon={<PlusCircle size={18} />} label="建立活動" />
      </div>

      {/* Profile */}
      <div className="card-surface flex flex-col gap-5 rounded-3xl p-6">
        <h3 className="font-display font-bold text-main">個人檔案</h3>
        <div className="flex items-center gap-4">
          <img src={form.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-brand-100" />
          <label className="btn-brand flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold">
            <ImagePlus size={14} /> {uploading ? "上傳中..." : "更換頭像"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
          </label>
        </div>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">暱稱</span>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={50} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">自我介紹</span>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} maxLength={500} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" placeholder="讓大家更認識你吧！" />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">性別</span>
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none">
              <option value="">不透露</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">年齡</span>
            <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
          </label>
        </div>

        <div>
          <span className="mb-2 block text-xs font-semibold text-soft">興趣標籤</span>
          <div className="flex flex-wrap gap-2">
            {EVENT_TAGS.map((tag) => (
              <button key={tag} type="button" onClick={() => toggleInterest(tag)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${form.interests.includes(tag) ? "bg-brand-500 text-white" : "bg-app-soft text-soft"}`}>
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <button disabled={saving} onClick={save} className="btn-brand flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 儲存變更
        </button>
      </div>

      {/* Password / security */}
      <div className="card-surface flex flex-col gap-4 rounded-3xl p-6">
        <h3 className="flex items-center gap-2 font-display font-bold text-main"><KeyRound size={18} className="text-brand-600" /> 帳號安全</h3>
        {pwMessage && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">{pwMessage}</p>}
        {pwError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600">{pwError}</p>}
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-soft">目前密碼</span>
          <input type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">新密碼（至少 8 碼）</span>
            <input type="password" minLength={8} value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-soft">確認新密碼</span>
            <input type="password" minLength={8} value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} className="w-full rounded-xl border border-[var(--color-border)] bg-app px-3 py-2.5 text-sm text-main outline-none" />
          </label>
        </div>
        <button disabled={pwSaving || !pwForm.currentPassword || pwForm.newPassword.length < 8} onClick={changePassword} className="btn-brand flex items-center justify-center gap-2 self-start rounded-full px-6 py-2.5 text-sm font-bold disabled:opacity-50">
          {pwSaving && <Loader2 size={16} className="animate-spin" />} 更新密碼
        </button>
        <p className="text-xs text-soft">忘記目前密碼？<Link href="/forgot-password" className="font-semibold text-brand-600 hover:underline">前往忘記密碼流程</Link></p>
      </div>

      <div className="card-surface rounded-3xl p-6">
        <h3 className="mb-2 flex items-center gap-2 font-display font-bold text-main"><ShieldCheck size={18} className="text-brand-600" /> 帳號資訊</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm text-soft">
          <span>Email：{user.email}</span>
        </div>
        <p className="mt-2 text-sm text-soft">信用分數：{Number(user.creditScore).toFixed(0)}</p>
        <p className="mt-1 text-sm text-soft">建立時間：{new Date(user.createdAt).toLocaleDateString("zh-TW")}</p>
      </div>

      {showAppealModal && (
        <AppealModal
          type={showAppealModal}
          onClose={() => setShowAppealModal(null)}
          onSubmitted={() => {
            setShowAppealModal(null);
            loadAppeals();
          }}
        />
      )}
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="card-surface flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/10 text-brand-600">{icon}</div>
      <span className="text-xs font-semibold text-main">{label}</span>
    </Link>
  );
}
