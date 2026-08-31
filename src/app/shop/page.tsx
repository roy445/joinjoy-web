"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShopPreviewButton } from "@/components/shop-visual";
import { ShoppingBag, Star, Award, User, Check, Coins, Loader2 } from "lucide-react";
import { JCoin } from "@/components/j-coin";
import { UserHonor } from "@/components/user-honor";
import { announceCelebration } from "@/components/celebration-feedback";
import { cn } from "@/lib/utils";

type ShopItem = {
  id: number;
  name: string;
  type: "title" | "badge" | "frame";
  price: number;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  metadata: any;
};

type InventoryItem = {
  itemId: number;
  isEquipped: boolean;
};

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "frame" | "title" | "badge">("all");

  const fetchData = useCallback(async () => {
    try {
      const [shopRes, invRes, userRes] = await Promise.all([
        fetch("/api/shop", { cache: "no-store" }),
        fetch("/api/inventory", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);
      const shopData = await shopRes.json();
      const invData = await invRes.json();
      const userData = await userRes.json();

      setItems(shopData.items || []);
      setInventory(invData.inventory || []);
      setUser(userData.user);
    } catch (err) {
      console.error("Failed to fetch shop data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchData]);

  async function handlePurchase(itemId: number) {
    setProcessingId(itemId);
    try {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (data.ok) {
        setUser((current: any) => current ? { ...current, jCoins: data.jCoins ?? Math.max(0, Number(current.jCoins || 0) - Number(items.find((item) => item.id === itemId)?.price || 0)) } : current);
        setInventory((current) => [...current, { itemId, isEquipped: false }]);
        window.dispatchEvent(new CustomEvent("joinjoy:user-updated"));
        announceCelebration({
          kind: "shop",
          title: "兌換成功！",
          description: data.message || "商品已加入你的榮譽收藏。",
        });
        alert(data.message);
        void fetchData();
      } else {
        alert(data.error || "購買失敗");
      }
    } finally {
      setProcessingId(null);
    }
  }

  async function handleEquip(itemId: number, currentlyEquipped: boolean) {
    setProcessingId(itemId);
    try {
      const res = await fetch("/api/shop/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, action: currentlyEquipped ? "unequip" : "equip" }),
      });
      const data = await res.json();
      if (data.ok) {
        setUser((current: any) => current ? { ...current, ...(data.user || {}) } : current);
        setInventory((current) => current.map((entry) => ({ ...entry, isEquipped: entry.itemId === itemId ? !currentlyEquipped : (currentlyEquipped ? entry.isEquipped : false) })));
        window.dispatchEvent(new CustomEvent("joinjoy:user-updated"));
        void fetchData();
      } else {
        alert(data.error || "操作失敗");
      }
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><div className="skeleton mb-8 h-40 rounded-[32px]" /><div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="card-surface overflow-hidden rounded-[2rem]"><div className="skeleton aspect-square" /><div className="space-y-3 p-6"><div className="skeleton h-5 w-3/5 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-10 w-full rounded-2xl" /></div></div>)}</div></div>;
  }

  const filteredItems = items.filter((item) => (typeFilter === "all" || item.type === typeFilter) && (!query || `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase())));

  const rarityColors = {
    common: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    uncommon: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    rare: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    epic: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    legendary: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 animate-pulse",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black text-main">
            <ShoppingBag className="text-coral-500" /> 榮譽商城
          </h1>
          <p className="mt-2 text-soft">使用 J-幣兌換專屬稱號、徽章與頭像框，展現你的社群地位。</p>
          <p className="mt-3 inline-flex rounded-full bg-brand-500/10 px-3 py-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">提示：其他買過的頭像框，可以到 <a href="/settings" className="ml-1 underline underline-offset-2">個人設定</a> 套用。</p>
        </div>
        
        {user && (
          <div className="flex items-center gap-4 rounded-3xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/30 dark:bg-brand-900/10">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">我的餘額</span>
              <div className="flex items-center gap-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                <JCoin size={24} />
                {user.jCoins || 0}
              </div>
            </div>
            <div className="h-10 w-px bg-brand-200 dark:bg-brand-800" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-soft uppercase tracking-wider">目前裝備</span>
              <div className="mt-1">
                <UserHonor 
                  name={user.name} 
                  role={user.role} 
                  activeTitle={user.activeTitle} 
                  activeBadge={user.activeBadge}
                  nameClassName="text-sm font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-3xl bg-app-soft p-3 md:flex-row md:items-center md:justify-between"><div className="flex flex-wrap gap-2">{([['all','全部'],['frame','頭像框'],['title','稱號'],['badge','徽章']] as const).map(([key,label]) => <button key={key} onClick={() => setTypeFilter(key)} className={cn("rounded-full px-3 py-2 text-xs font-bold", typeFilter === key ? "bg-brand-500 text-white" : "text-soft hover:bg-app hover:text-main")}>{label}</button>)}</div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋收藏品" className="rounded-full border border-[var(--color-border)] bg-app px-4 py-2 text-sm text-main outline-none focus:ring-2 focus:ring-brand-400" /></div><motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }} className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item, index) => {
          const invItem = inventory.find((i) => i.itemId === item.id);
          const isOwned = !!invItem;
          const isEquipped = invItem?.isEquipped || false;
          const canAfford = (user?.jCoins || 0) >= item.price;
          const isProcessing = processingId === item.id;

          return (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: index * 0.06 }}
              key={item.id} 
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-app-soft transition-all hover:-translate-y-1 hover:shadow-xl",
                isEquipped && "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-[#10161a]"
              )}
            >
              <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800/50">
                <div className="flex h-full w-full items-center justify-center p-8">
                  <ShopPreviewButton item={item} />
                  {/* The existing type-specific preview remains available as the fallback metadata surface. */}
                  {false && item.type === "title" && (
                    <div className="flex flex-col items-center gap-2">
                      <Star className="h-12 w-12 text-brand-400 opacity-20" />
                      <span className={cn(
                        "rounded-lg px-4 py-2 text-lg font-black shadow-sm",
                        item.rarity === "epic" || item.rarity === "legendary" ? "animate-gold-glow" : "bg-white text-brand-700 dark:bg-slate-700 dark:text-brand-300"
                      )}>
                        {item.name}
                      </span>
                    </div>
                  )}
                  {item.type === "badge" && (
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-inner dark:bg-slate-700">
                      <Award className={cn(
                        "h-12 w-12",
                        item.rarity === "legendary" ? "text-amber-500" : "text-brand-500"
                      )} />
                      {item.rarity === "legendary" && (
                        <div className="absolute inset-0 animate-ping rounded-full border-2 border-amber-400 opacity-20" />
                      )}
                    </div>
                  )}
                  {item.type === "frame" && (
                    <div
                      className={cn(
                        "honor-frame-preview relative flex h-28 w-28 items-center justify-center rounded-full border-4 bg-white",
                        `honor-frame-${item.rarity}`,
                        item.rarity === "common" && "border-slate-300 shadow-sm",
                        item.rarity === "rare" && "border-brand-500 shadow-[0_0_18px_rgba(51,153,144,0.34)]",
                        item.rarity === "epic" && "border-coral-500 shadow-[0_0_22px_rgba(229,103,63,0.42)]",
                        item.rarity === "legendary" && "border-[#bf953f] shadow-[0_0_28px_rgba(191,149,63,0.55)]",
                      )}
                    >
                      <div
                        className={cn(
                          "absolute -inset-2 rounded-full border-2",
                          item.rarity === "common" && "border-slate-200",
                          item.rarity === "rare" && "border-brand-300",
                          item.rarity === "epic" && "border-coral-300",
                          item.rarity === "legendary" && "border-[#f5d98b]",
                        )}
                      />
                      {(item.rarity === "epic" || item.rarity === "legendary") && (
                        <span className="absolute -right-2 -top-2 text-lg text-amber-500 animate-pulse-subtle" aria-hidden="true">✦</span>
                      )}
                      {item.rarity === "legendary" && (
                        <span className="honor-frame-orbit absolute inset-[-14px] rounded-full border border-dashed border-[#bf953f]" aria-hidden="true" />
                      )}
                      <User className={cn(
                        "relative z-10 h-14 w-14",
                        item.rarity === "legendary" ? "text-[#bf953f]" : item.rarity === "epic" ? "text-coral-500" : item.rarity === "rare" ? "text-brand-500" : "text-slate-400",
                      )} />
                    </div>
                  )}
                </div>
                
                <div className="absolute left-4 top-4">
                  <span className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                    rarityColors[item.rarity]
                  )}>
                    {item.rarity}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-black text-main">{item.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-soft">{item.description}</p>
                
                <div className="mt-auto pt-6">
                  {isOwned ? (
                    <button
                      onClick={() => handleEquip(item.id, isEquipped)}
                      disabled={isProcessing}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all",
                        isEquipped 
                          ? "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400" 
                          : "bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/20"
                      )}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEquipped ? "卸下項目" : "立即裝備")}
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePurchase(item.id)}
                      disabled={!canAfford || isProcessing}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all shadow-lg",
                        canAfford 
                          ? "bg-coral-500 text-white hover:bg-coral-600 shadow-coral-500/20" 
                          : "bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800"
                      )}
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                        <>
                          <JCoin size={16} />
                          <span>{item.price} 兌換</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isEquipped && (
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg">
                  <Check size={16} strokeWidth={3} />
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 rounded-full bg-slate-100 p-6 dark:bg-slate-800">
            <ShoppingBag className="h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-main">商城裝修中</h3>
          <p className="mt-2 text-soft">目前沒有可購買的商品，請稍後再來。</p>
        </div>
      )}
    </div>
  );
}
