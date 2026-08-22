"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
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
  { href: "/leaderboard", label: "排行榜", icon: Trophy },
  { href: "/notifications", label: "通知中心", icon: Bell },
  { href: "/settings", label: "個人設定", icon: Settings },
];

export function AppShell({ user, children }: { user: ClientUser | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
                        <span className="rounded bg-brand-500 px-1 py-0.5 text-[8px] font-black leading-none text-white">BETA</span>
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
                        <span className="rounded bg-brand-500 px-1 py-0.5 text-[8px] font-black leading-none text-white">BETA</span>
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
              <p className="truncate text-sm font-semibold text-main">{user.name}</p>
              <p className="truncate text-xs text-soft">信用分數 {Number(user.creditScore).toFixed(0)}</p>
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
          <div className="ml-auto flex shrink-0 items-center gap-2">
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
                <span className="absolute right-0.5 top-0.5 rounded bg-brand-500 px-0.5 py-0.25 text-[7px] font-black leading-none text-white scale-90">BETA</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}