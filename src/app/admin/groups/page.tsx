"use client";

import { FormEvent, useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { CheckCircle2, Edit2, Loader2, Plus, RefreshCw, ShieldCheck, Sparkles, X, XCircle } from "lucide-react";

type Group = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  effect: string | null;
  description: string | null;
  dailyAiLimit: number;
  jCoinBonus: number;
  maxBonusCap: number;
  isActive: boolean;
  createdAt: string;
};

type GroupDraft = {
  name: string;
  icon: string;
  color: string;
  effect: string;
  description: string;
  dailyAiLimit: string;
  jCoinBonus: string;
  maxBonusCap: string;
  isActive: boolean;
};

const emptyDraft: GroupDraft = {
  name: "",
  icon: "✦",
  color: "#247A57",
  effect: "soft-glow",
  description: "",
  dailyAiLimit: "50",
  jCoinBonus: "0",
  maxBonusCap: "30",
  isActive: true,
};

function draftFromGroup(group: Group): GroupDraft {
  return {
    name: group.name,
    icon: group.icon || "✦",
    color: group.color || "#247A57",
    effect: group.effect || "",
    description: group.description || "",
    dailyAiLimit: String(group.dailyAiLimit),
    jCoinBonus: String(group.jCoinBonus),
    maxBonusCap: String(group.maxBonusCap),
    isActive: group.isActive,
  };
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(emptyDraft);

  async function loadGroups() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/groups", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setSetupRequired(Boolean(data?.setupRequired));
        throw new Error(data?.error || "無法載入身份組");
      }
      setGroups(Array.isArray(data) ? data : []);
      setSetupRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入身份組");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGroups(), 0);
    return () => window.clearTimeout(timer);
    // 初次載入只執行一次；儲存後由事件處理器明確重新載入。
  }, []);

  function openCreate() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function openEdit(group: Group) {
    setEditingId(group.id);
    setDraft(draftFromGroup(group));
    setError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function updateDraft<K extends keyof GroupDraft>(key: K, value: GroupDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/groups", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: draft.name,
          icon: draft.icon,
          color: draft.color,
          effect: draft.effect,
          description: draft.description,
          dailyAiLimit: Number(draft.dailyAiLimit),
          jCoinBonus: Number(draft.jCoinBonus),
          maxBonusCap: Number(draft.maxBonusCap),
          isActive: draft.isActive,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "身份組儲存失敗");
      setModalOpen(false);
      setNotice(editingId ? "身份組已更新。" : "身份組已建立。現在可以在會員管理指定給使用者。" );
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "身份組儲存失敗");
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    setSeeding(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "預設身份組建立失敗");
      setNotice("已準備好「新朋友」、「熱心揪主」與「城市探索家」三個預設身份組。" );
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "預設身份組建立失敗");
    } finally {
      setSeeding(false);
    }
  }

  async function deactivateGroup(group: Group) {
    if (!window.confirm(`確定停用「${group.name}」？歷史授予紀錄會保留，現有授予會撤銷。`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/groups?id=${group.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "身份組停用失敗");
      setNotice(`「${group.name}」已停用，歷史紀錄仍會保留。`);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "身份組停用失敗");
    }
  }

  async function reactivateGroup(group: Group) {
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: group.id, isActive: true }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "身份組重新啟用失敗");
      setNotice(`「${group.name}」已重新啟用。`);
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "身份組重新啟用失敗");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <SectionTitle eyebrow="IDENTITY" title="身份組管理" />
          <p className="mt-2 max-w-2xl text-sm font-bold text-soft">自訂社群身份的名稱、圖示、顏色、特效、AI 額度與 J 幣加成；停用只會停止新授予，不會刪除審計歷史。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void seedDefaults()} disabled={seeding || loading || setupRequired} className="flex items-center gap-2 rounded-2xl border-2 border-brand-200 bg-white px-4 py-3 text-sm font-black text-brand-700 shadow-sm transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50">
            {seeding ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {seeding ? "準備中…" : "建立預設身份組"}
          </button>
          <button type="button" onClick={openCreate} disabled={setupRequired} className="btn-brand flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black shadow-lg shadow-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            <Plus size={18} /> 建立新身份組
          </button>
        </div>
      </div>

      {error && <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">{error}</div>}
      {notice && <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800" role="status">{notice}</div>}
      {setupRequired && <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900" role="alert">請先在同一個正式資料庫執行 <code className="rounded bg-amber-100 px-1.5 py-0.5">drizzle/0002_admin_identity_jcoins.sql</code>，再重新整理本頁。尚未完成遷移前不會建立任何身份組資料。</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton h-72 rounded-[2rem]" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="card-surface rounded-[2rem] px-6 py-16 text-center">
          <ShieldCheck className="mx-auto text-brand-500" size={42} />
          <h3 className="mt-4 text-xl font-black text-main">還沒有身份組</h3>
          <p className="mx-auto mt-2 max-w-md text-sm font-bold text-soft">可以先建立三個預設身份組，再依社群規則修改；也可以直接建立自己的身份組。</p>
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => void seedDefaults()} disabled={seeding || setupRequired} className="btn-brand rounded-xl px-4 py-2.5 text-sm font-black">建立預設身份組</button>
            <button type="button" onClick={openCreate} disabled={setupRequired} className="rounded-xl border-2 border-brand-200 bg-white px-4 py-2.5 text-sm font-black text-brand-700">自行建立</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className={`card-surface overflow-hidden rounded-[2rem] border-2 transition-all ${group.isActive ? "border-transparent hover:border-brand-100" : "border-slate-200 opacity-75"}`}>
              <div className="h-2 w-full" style={{ backgroundColor: group.color || "#247A57" }} />
              <div className="p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-2xl" aria-hidden="true">{group.icon || "🛡️"}</span>
                    <h3 className="truncate text-xl font-black text-main">{group.name}</h3>
                  </div>
                  {group.isActive ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700"><CheckCircle2 size={10} /> 啟用中</span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600"><XCircle size={10} /> 已停用</span>
                  )}
                </div>
                <p className="min-h-[2.5rem] line-clamp-2 text-sm font-bold text-soft">{group.description || "尚未填寫描述"}</p>
                <p className="mt-2 text-xs font-bold text-soft">特效：{group.effect || "無"}</p>

                <div className="mt-6 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-app-soft p-3 text-center"><p className="text-[10px] font-black text-soft">AI/日</p><p className="text-lg font-black text-main">{group.dailyAiLimit}</p></div>
                  <div className="rounded-xl bg-app-soft p-3 text-center"><p className="text-[10px] font-black text-soft">J 幣加成</p><p className="text-lg font-black text-brand-600">+{group.jCoinBonus}%</p></div>
                  <div className="rounded-xl bg-app-soft p-3 text-center"><p className="text-[10px] font-black text-soft">最高上限</p><p className="text-lg font-black text-coral-600">{group.maxBonusCap}%</p></div>
                </div>

                <div className="mt-6 flex items-center gap-2 border-t border-brand-50 pt-6">
                  <button type="button" onClick={() => openEdit(group)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-app-soft py-3 text-sm font-bold text-main transition hover:bg-brand-50 hover:text-brand-700"><Edit2 size={16} /> 編輯</button>
                  {group.isActive ? (
                    <button type="button" onClick={() => void deactivateGroup(group)} className="flex h-11 items-center justify-center gap-1 rounded-xl bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"><XCircle size={16} /> 停用</button>
                  ) : (
                    <button type="button" onClick={() => void reactivateGroup(group)} className="flex h-11 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"><RefreshCw size={16} /> 啟用</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" role="presentation">
          <div className="flex min-h-full items-center justify-center py-6">
            <form onSubmit={submitGroup} className="w-full max-w-2xl rounded-[2rem] border-4 border-brand-500 bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="group-form-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-600">IDENTITY CONFIGURATION</p>
                  <h2 id="group-form-title" className="mt-1 text-2xl font-black text-main">{editingId ? "編輯身份組" : "建立新身份組"}</h2>
                  <p className="mt-1 text-sm font-bold text-soft">所有設定都會由後端驗證並留下管理員操作紀錄。</p>
                </div>
                <button type="button" onClick={closeModal} className="rounded-full p-2 text-soft transition hover:bg-app-soft hover:text-main" aria-label="關閉"><X size={20} /></button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-black text-main">名稱<input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} maxLength={100} required className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="例如：城市攝影家" /></label>
                <label className="text-sm font-black text-main">圖示<input value={draft.icon} onChange={(event) => updateDraft("icon", event.target.value)} maxLength={20} className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="例如：📷" /></label>
                <label className="text-sm font-black text-main">顏色<input type="text" value={draft.color} onChange={(event) => updateDraft("color", event.target.value)} maxLength={20} pattern="#[0-9a-fA-F]{6}" required className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="#247A57" /></label>
                <label className="text-sm font-black text-main">特效名稱<input value={draft.effect} onChange={(event) => updateDraft("effect", event.target.value)} maxLength={50} className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="例如：gold-shimmer" /></label>
                <label className="text-sm font-black text-main">每日 AI 額度<input type="number" min={0} max={1000} value={draft.dailyAiLimit} onChange={(event) => updateDraft("dailyAiLimit", event.target.value)} required className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" /></label>
                <label className="text-sm font-black text-main">J 幣加成（%）<input type="number" min={0} max={100} value={draft.jCoinBonus} onChange={(event) => updateDraft("jCoinBonus", event.target.value)} required className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" /></label>
                <label className="text-sm font-black text-main">最高加成上限（%）<input type="number" min={0} max={100} value={draft.maxBonusCap} onChange={(event) => updateDraft("maxBonusCap", event.target.value)} required className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" /></label>
                <label className="flex items-center gap-3 self-end rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-black text-main"><input type="checkbox" checked={draft.isActive} onChange={(event) => updateDraft("isActive", event.target.checked)} className="h-4 w-4 accent-brand-600" />身份組啟用中</label>
              </div>

              <label className="mt-4 block text-sm font-black text-main">描述<textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} maxLength={1000} rows={3} className="mt-2 w-full resize-y rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="說明這個身份組適合誰，以及能帶來什麼社群體驗。" /></label>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 rounded-xl border-2 border-brand-100 py-3 text-sm font-black text-main transition hover:bg-app-soft disabled:opacity-50">取消</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-black text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={17} className="animate-spin" />儲存中…</span> : "儲存身份組"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
