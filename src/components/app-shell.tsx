"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  MapPin,
  Bookmark,
  CalendarCheck,
  Bell,
  Settings,
  Trophy,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  PlusCircle,
  Users,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { BetaBadge } from "@/components/beta-badge";
import { UserHonor } from "@/components/user-honor";
import { JCoin } from "@/components/j-coin";
import { JueJueChat } from "@/components/juejue-chat";
import { HonorNotificationListener } from "@/components/honor-notification-listener";
import type { ClientUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const exploreNav = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/planner", label: "AI 出遊規劃", icon: Sparkles },
  { href: "/map", label: "地圖模式", icon: MapPin },
  { href: "/groups", label: "揪團社", icon: Users },
  { href: "/favorites", label: "我的收藏", icon: Bookmark },
  { href: "/my-events", label: "我的活動", icon: CalendarCheck },
];

const otherNav = [
  { href: "/shop", label: "榮譽商城", icon: ShoppingBag },
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/notifications", label: "通知中心", icon: Bell },
  { href: "/settings", label: "個人設定", icon: Settings },
];

export function AppShell({ user, children }: { user: ClientUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGamificationGuide, setShowGamificationGuide] = useState(false);

  useEffect(() => {
    // 檢查是否為第一次登入後進入，顯示遊戲化入門指南
    if (typeof window !== "undefined" && user) {
      const hasSeenGamificationGuide = window.localStorage.getItem("joinjoy:gamification-guide-seen");
      if (!hasSeenGamificationGuide) {
        setShowGamificationGuide(true);
        window.localStorage.setItem("joinjoy:gamification-guide-seen", "true");
      }
    }
  }, [user]);

  const isAuthPage = pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  if (isAuthPage) {
    return <div className="min-h-screen bg-app">{children}</div>;
  }

  const navContent = (
    <div className="flex h-full flex-col gap-6">
      <div className="px-1">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto hide-scrollbar">
        <div>
          <p className="mb-2 px-2 text-xs font-semibold text-soft">探索</p>
          <ul className="flex flex-col gap-1">
            {exploreNav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "text-soft hover:bg-app-soft hover:text-main"
                    )}
                  >
                    <Icon size={18} />
                    <span className="flex flex-1 items-center justify-between">
                      {item.label}
                      {item.href === "/planner" && (
                        <div className="scale-75 origin-right">
                          <BetaBadge />
                        </div>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 px-2 text-xs font-semibold text-soft">其他</p>
          <ul className="flex flex-col gap-1">
            {otherNav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-brand-500/10 text-brand-700 dark:text-brand-300"
                        : "text-soft hover:bg-app-soft hover:text-main"
                    )}
                  >
                    <Icon size={18} />
                    <span className="flex flex-1 items-center justify-between">
                      {item.label}
                      {item.href === "/planner" && (
                        <div className="scale-75 origin-right">
                          <BetaBadge />
                        </div>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
            {user?.role === "admin" && (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setDrawerOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                    pathname.startsWith("/admin")
                      ? "bg-coral-500/10 text-coral-600"
                      : "text-soft hover:bg-app-soft hover:text-main"
                  )}
                >
                  <ShieldCheck size={18} />
                  管理後台
                </Link>
              </li>
            )}
          </ul>
        </div>
      </nav>

      <Link
        href="/events/create"
        onClick={() => setDrawerOpen(false)}
        className="btn-coral flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold"
      >
        <PlusCircle size={18} /> 建立活動
      </Link>

      <div className="rounded-2xl border border-[var(--color-border)] bg-app-soft p-3">
        {user ? (
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`}
              alt={user.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <UserHonor
                name={user.name}
                role={user.role}
                activeTitle={user.activeTitle}
                activeBadge={user.activeBadge}
                nameClassName="text-sm"
              />
              <div className="mt-0.5 flex items-center gap-2">
                <p className="truncate text-[10px] text-soft">信用 {Number(user.creditScore).toFixed(0)}</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 animate-pulse-subtle dark:text-amber-400">
                  <JCoin size={14} />
                  {user.jCoins || 0}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} aria-label="登出" className="rounded-full p-2 text-soft hover:bg-app hover:text-coral-500">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-main">尚未登入</p>
              <p className="text-xs text-soft">登入後開始探索</p>
            </div>
            <Link href="/login" className="btn-brand rounded-full px-3 py-2 text-xs font-bold">
              登入
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-app">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-[var(--color-border)] bg-app-soft p-5 md:flex">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative h-full w-72 animate-fade-up bg-app-soft p-5">
            <button onClick={() => setDrawerOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-soft">
              <X size={20} />
            </button>
            {navContent}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex w-full items-center gap-3 border-b border-[var(--color-border)] bg-app/90 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex shrink-0 items-center gap-3 md:hidden">
            <button onClick={() => setDrawerOpen(true)} className="rounded-full p-2 text-main">
              <Menu size={22} />
            </button>
            <Logo size={32} />
          </div>
          <div className="flex-1" />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {user && (
              <Link 
                href="/shop" 
                className="group flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 transition-all hover:bg-amber-100 hover:shadow-md dark:bg-amber-900/20"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-amber-200 transition-transform group-hover:scale-110 dark:bg-amber-800 dark:ring-amber-700">
                  <JCoin size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600/60 dark:text-amber-400/60">J-Coins</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">{user.jCoins || 0}</span>
                </div>
              </Link>
            )}
            <Link href="/events/create" className="btn-coral hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap md:flex">
              <PlusCircle size={16} /> 建立活動
            </Link>
            <ThemeToggle />
            <NotificationBell loggedIn={!!user} />
            {!user && (
              <Link href="/login" className="btn-brand hidden whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold md:inline-block">
                登入 / 註冊
              </Link>
            )}
            {user && (
              <Link href={`/profile/${user.id}`} className="hidden shrink-0 md:block">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/9.x/notionists/svg?seed=${user.id}`}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-brand-200"
                />
              </Link>
            )}
          </div>
        </header>

        <main key={pathname} className="flex-1 animate-fade-up" style={{ animationDuration: "0.35s" }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-[var(--color-border)] bg-app/95 py-2 backdrop-blur-md md:hidden">
        {[exploreNav[0], exploreNav[1], exploreNav[3], exploreNav[4], { href: "/notifications", label: "通知", icon: Bell }].map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("relative flex flex-col items-center gap-0.5 px-2 py-1 text-[11px]", active ? "text-brand-600" : "text-soft")}>
              <Icon size={20} />
              {item.label}
              {item.href === "/planner" && (
                <div className="absolute -right-1 -top-1 scale-[0.6] origin-top-right">
                  <BetaBadge />
                </div>
              )}
            </Link>
          );
        })}
      </nav>
            {user && (
        <>
          <JueJueChat userId={user.id} />
          <HonorNotificationListener userId={user.id} />

          {/* Gamification Guide Modal - Solid High Contrast Design */}
          {showGamificationGuide && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border-[6px] border-coral-500 bg-white shadow-[0_0_80px_rgba(229,103,63,0.6)] animate-in zoom-in-95 duration-500">
                {/* Header - Solid Coral with Clear Text */}
                <div className="bg-coral-600 p-10 text-center border-b-[6px] border-coral-500">
                  <div className="mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-[2.5rem] bg-white shadow-2xl ring-4 ring-coral-400">
                    <JCoin size={80} animate />
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-md">🎉 全新 J-幣系統！</h2>
                  <p className="mt-3 text-2xl font-bold text-white drop-shadow-sm">開啟你的 JoinJoy 榮譽傳奇</p>
                </div>

                <div className="bg-white p-10">
                  <div className="space-y-8">
                    {/* J-Coins Usage - Solid High Contrast */}
                    <div className="flex items-start gap-6 rounded-[2rem] bg-[#fff1f0] p-7 border-2 border-coral-200 shadow-sm">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-coral-600 text-white shadow-xl">
                        <ShoppingBag size={32} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-coral-900">J-幣有什麼用？</p>
                        <p className="mt-2 text-lg font-bold text-coral-800 leading-relaxed">
                          這是你的社群資產！可以在「榮譽商城」購買酷炫的<span className="text-coral-600">頭像框、稀有稱號與專屬徽章</span>，展現你的社群地位。
                        </p>
                      </div>
                    </div>

                    {/* How to get */}
                    <div className="flex items-start gap-6 rounded-[2rem] bg-[#fffbeb] p-7 border-2 border-amber-200 shadow-sm">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-xl">
                        <Trophy size={32} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-amber-900">如何獲得 J-幣？</p>
                        <div className="mt-2 text-lg font-bold text-amber-800 leading-relaxed space-y-1">
                          <p>• <span className="text-amber-600">擔任揪主</span>：完成活動即獲 <span className="text-3xl font-black text-amber-600">50</span> J-幣</p>
                          <p>• <span className="text-amber-600">參加活動</span>：準時出席即獲 <span className="text-3xl font-black text-amber-600">10</span> J-幣</p>
                        </div>
                      </div>
                    </div>

                    {/* Special Status */}
                    <div className="flex items-start gap-6 rounded-[2rem] bg-[#f0fdf4] p-7 border-2 border-brand-200 shadow-sm">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xl">
                        <Sparkles size={32} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-brand-900">身分與特效</p>
                        <p className="mt-2 text-lg font-bold text-brand-800 leading-relaxed">
                          你的名稱會根據角色變色（👑 管理員金色發光、⭐ 揪主珊瑚橘），還能解鎖專屬 AI 稱號！
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowGamificationGuide(false)}
                    className="mt-12 w-full rounded-[1.5rem] bg-coral-600 py-6 text-3xl font-black text-white shadow-[0_8px_0_#c2410c] transition-all hover:translate-y-[-2px] hover:shadow-[0_10px_0_#c2410c] active:translate-y-[2px] active:shadow-none ring-4 ring-coral-500/20"
                  >
                    立即開始賺取 J-幣！
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}