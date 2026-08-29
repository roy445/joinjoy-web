"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionTitle } from "@/components/ui";
import { ArrowDownLeft, ArrowUpRight, Filter, Gift, Loader2, Minus, Plus, Search, User, X } from "lucide-react";
import { JCoin } from "@/components/j-coin";

type CoinTransaction = {
  id: number;
  userId: number;
  amount: number;
  type: string;
  reason: string;
  adminId: number | null;
  createdAt: string;
};

type UserOption = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  jCoins: number;
  role: string;
  status: string;
};

type ShopItem = {
  id: number;
  name: string;
  type: string;
  price: number;
  description: string | null;
  rarity: string;
};

export default function AdminJCoinsPage() {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [adjustTarget, setAdjustTarget] = useState<number | null>(null);
  const [manualUserId, setManualUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [giftType, setGiftType] = useState<"jcoins" | "item">("jcoins");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [operation, setOperation] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadTransactions() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/jcoins/transactions", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "無法載入交易紀錄");
      setTransactions(Array.isArray(data) ? data : data?.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入交易紀錄");
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(query = "") {
    setUsersLoading(true);
    try {
      const response = await fetch(`/api/admin/users/lookup?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "無法載入使用者選單");
      setUserOptions(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入使用者選單");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadItems() {
    if (items.length > 0) return;
    setItemsLoading(true);
    try {
      const response = await fetch("/api/shop", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "無法載入可贈送物品");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入可贈送物品");
    } finally {
      setItemsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTransactions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((tx) =>
      String(tx.userId).includes(query) || tx.reason.toLowerCase().includes(query),
    );
  }, [search, transactions]);

  const selectedUser = userOptions.find((user) => user.id === adjustTarget);
  const selectedItem = items.find((item) => item.id === Number(selectedItemId));

  function openAdjust(userId: number) {
    const initialId = userId > 0 ? userId : 0;
    setAdjustTarget(initialId);
    setManualUserId(initialId > 0 ? String(initialId) : "");
    setUserSearch("");
    setGiftType("jcoins");
    setSelectedItemId("");
    setOperation("add");
    setAmount("");
    setReason("");
    setError("");
    setSuccess("");
    void loadUsers(initialId > 0 ? String(initialId) : "");
    void loadItems();
  }

  function closeAdjust() {
    if (saving) return;
    setAdjustTarget(null);
    setError("");
    setSuccess("");
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adjustTarget || adjustTarget <= 0) {
      setError("請從選單選擇使用者，或輸入有效的專屬 ID");
      return;
    }
    if (reason.trim().length < 2) {
      setError("請填寫至少 2 個字的贈送／調整原因");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (giftType === "jcoins") {
        const parsedAmount = Number(amount);
        if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
          setError("請輸入正整數 J 幣數量");
          return;
        }

        const response = await fetch("/api/admin/jcoins/adjust", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: adjustTarget,
            amount: operation === "add" ? parsedAmount : -parsedAmount,
            reason: reason.trim(),
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "J 幣調整失敗");

        setSuccess(`已完成 J 幣${operation === "add" ? "贈送" : "扣除"}，目前餘額為 ${data.balanceAfter} J 幣`);
      } else {
        const itemId = Number(selectedItemId);
        if (!Number.isSafeInteger(itemId) || itemId <= 0) {
          setError("請選擇要贈送的商城物品");
          return;
        }

        const response = await fetch("/api/admin/rewards/gift", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: adjustTarget, giftType: "item", itemId, reason: reason.trim() }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "物品贈送失敗");

        setSuccess(`已贈送「${data.item?.name || selectedItem?.name || "商城物品"}」，對方下次登入會看到通知`);
      }

      setAmount("");
      setReason("");
      await loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "贈送／調整失敗");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionTitle eyebrow="AUDIT" title="J 幣與贈送管理" />
        <button
          type="button"
          onClick={() => openAdjust(0)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-coral-600 px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-coral-700 active:scale-[0.98]"
        >
          <Gift size={17} /> 贈送 J 幣／物品
        </button>
      </div>

      <div className="card-surface rounded-[2rem] p-5 sm:p-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-soft" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              placeholder="搜尋使用者 ID 或原因"
              className="w-full rounded-2xl bg-app-soft py-3 pl-12 pr-4 text-sm font-bold text-main outline-none ring-brand-500/20 placeholder:text-soft focus:ring-2"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-soft">
            <Filter size={16} /> 顯示最近 {visibleTransactions.length} 筆
          </div>
        </div>

        {loading ? (
          <div className="skeleton h-48 rounded-2xl" />
        ) : visibleTransactions.length === 0 ? (
          <div className="rounded-2xl bg-app-soft px-4 py-12 text-center text-sm font-bold text-soft">
            目前沒有符合條件的 J 幣交易紀錄。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-100 text-xs font-black text-soft">
                  <th className="pb-4 pr-4">交易時間</th>
                  <th className="pb-4 pr-4">使用者</th>
                  <th className="pb-4 pr-4">類型</th>
                  <th className="pb-4 pr-4 text-right">金額</th>
                  <th className="pb-4 pr-4">原因</th>
                  <th className="pb-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {visibleTransactions.map((tx) => {
                  const isPositive = Number(tx.amount) > 0;
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-app-soft/60">
                      <td className="whitespace-nowrap py-4 pr-4 text-xs text-soft">
                        {new Date(tx.createdAt).toLocaleString("zh-TW")}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                            <User size={14} />
                          </div>
                          <span className="font-bold text-main">UID: {tx.userId}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                          tx.type === "earn" ? "bg-emerald-50 text-emerald-700" :
                          tx.type === "spend" ? "bg-coral-50 text-coral-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {tx.type === "earn" ? "獲得" : tx.type === "spend" ? "消耗" : "人工調整"}
                        </span>
                      </td>
                      <td className={`py-4 pr-4 text-right text-lg font-black ${isPositive ? "text-emerald-700" : "text-coral-700"}`}>
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                          {Math.abs(Number(tx.amount))}
                          <JCoin size={16} />
                        </div>
                      </td>
                      <td className="max-w-xs py-4 pr-4 font-bold text-main">{tx.reason}</td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openAdjust(tx.userId)}
                          className="rounded-xl bg-coral-50 px-3 py-2 text-xs font-black text-coral-700 transition hover:bg-coral-100"
                        >
                          調整／贈送
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {adjustTarget !== null && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-4" role="presentation">
          <div className="flex min-h-full items-center justify-center py-6">
            <form
              onSubmit={submitAdjustment}
              className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border-4 border-coral-500 bg-white p-6 shadow-2xl sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-labelledby="jcoin-adjust-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-coral-600">ADMIN REWARDS</p>
                  <h2 id="jcoin-adjust-title" className="mt-1 text-xl font-black text-main">贈送 J 幣或商城物品</h2>
                  <p className="mt-1 text-sm font-bold text-soft">所有贈送與調整都會留下審計紀錄</p>
                </div>
                <button type="button" onClick={closeAdjust} className="rounded-full p-2 text-soft transition hover:bg-app-soft hover:text-main" aria-label="關閉">
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 rounded-2xl border-2 border-brand-100 bg-brand-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-brand-800"><User size={16} /> 選擇收件人</div>
                <div className="mt-3 flex gap-2">
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), void loadUsers(userSearch))}
                    placeholder="搜尋姓名、Email 或 UID"
                    className="min-w-0 flex-1 rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm font-bold text-main outline-none focus:border-brand-500"
                  />
                  <button type="button" onClick={() => void loadUsers(userSearch)} disabled={usersLoading} className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50">
                    {usersLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  </button>
                </div>
                <select
                  value={adjustTarget || ""}
                  onChange={(event) => {
                    const id = Number(event.target.value) || 0;
                    setAdjustTarget(id);
                    setManualUserId(id > 0 ? String(id) : "");
                  }}
                  className="mt-3 w-full rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm font-bold text-main outline-none focus:border-brand-500"
                >
                  <option value="">從使用者清單選擇</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>{user.name} · UID {user.id} · {user.email}</option>
                  ))}
                </select>
                <div className="mt-3 flex items-center gap-2">
                  <span className="shrink-0 text-xs font-black text-brand-800">或輸入 UID</span>
                  <input
                    value={manualUserId}
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, "");
                      setManualUserId(value);
                      setAdjustTarget(Number(value) || 0);
                    }}
                    inputMode="numeric"
                    min="1"
                    placeholder="例如 123"
                    className="min-w-0 flex-1 rounded-xl border-2 border-brand-100 bg-white px-3 py-2.5 text-sm font-bold text-main outline-none focus:border-brand-500"
                  />
                </div>
                {selectedUser ? (
                  <p className="mt-2 text-xs font-bold text-brand-800">已選：{selectedUser.name}（UID {selectedUser.id}，目前 {selectedUser.jCoins} J 幣）</p>
                ) : adjustTarget && adjustTarget > 0 ? (
                  <p className="mt-2 text-xs font-bold text-amber-700">已輸入 UID {adjustTarget}，送出時會由後端再次確認使用者存在。</p>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-app-soft p-1">
                <button type="button" onClick={() => setGiftType("jcoins")} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${giftType === "jcoins" ? "bg-coral-600 text-white shadow" : "text-soft hover:text-main"}`}>
                  <JCoin size={16} /> J 幣
                </button>
                <button type="button" onClick={() => { setGiftType("item"); void loadItems(); }} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${giftType === "item" ? "bg-brand-600 text-white shadow" : "text-soft hover:text-main"}`}>
                  <Gift size={16} /> 商城物品
                </button>
              </div>

              {giftType === "jcoins" ? (
                <>
                  <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-app-soft p-1">
                    <button type="button" onClick={() => setOperation("add")} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${operation === "add" ? "bg-emerald-600 text-white shadow" : "text-soft hover:text-main"}`}>
                      <Plus size={16} /> 增加
                    </button>
                    <button type="button" onClick={() => setOperation("subtract")} className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black transition ${operation === "subtract" ? "bg-coral-600 text-white shadow" : "text-soft hover:text-main"}`}>
                      <Minus size={16} /> 扣除
                    </button>
                  </div>
                  <label className="mt-5 block text-sm font-black text-main">
                    J 幣數量
                    <input type="number" min="1" max="100000" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 font-bold text-main outline-none focus:border-brand-500" placeholder="請輸入整數" />
                  </label>
                </>
              ) : (
                <label className="mt-5 block text-sm font-black text-main">
                  要贈送的商城物品
                  <select value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)} disabled={itemsLoading} className="mt-2 w-full rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 font-bold text-main outline-none focus:border-brand-500" required>
                    <option value="">{itemsLoading ? "載入物品中…" : items.length > 0 ? "請選擇物品" : "目前沒有可贈送的商城物品"}</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} · {item.type} · {item.rarity}</option>
                    ))}
                  </select>
                  {selectedItem?.description && <span className="mt-1 block text-xs font-bold text-soft">{selectedItem.description}</span>}
                </label>
              )}

              <label className="mt-5 block text-sm font-black text-main">
                贈送／調整原因（必填）
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={255} className="mt-2 w-full resize-y rounded-xl border-2 border-brand-100 bg-app-soft px-3 py-3 text-sm font-bold text-main outline-none focus:border-brand-500" placeholder="例如：活動獎勵補發，請說明原因" required />
              </label>

              {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700" role="alert">{error}</p>}
              {success && <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700" role="status">{success}</p>}

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={closeAdjust} disabled={saving} className="flex-1 rounded-xl border-2 border-brand-100 py-3 text-sm font-black text-main transition hover:bg-app-soft disabled:opacity-50">關閉</button>
                <button type="submit" disabled={saving || !adjustTarget || adjustTarget <= 0} className="flex-1 rounded-xl bg-coral-600 py-3 text-sm font-black text-white transition hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? "處理中…" : giftType === "jcoins" ? "確認 J 幣調整" : "確認贈送物品"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
