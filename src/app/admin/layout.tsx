import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import {
  LayoutDashboard, Users, KeyRound, ClipboardCheck, CalendarX, MessageSquare,
  MessagesSquare, Flag, ShieldBan, Megaphone, ScrollText,   ShieldQuestion, Sparkles,

} from "lucide-react";

const navItems = [
  { href: "/admin", label: "總覽", icon: LayoutDashboard },
  { href: "/admin/members", label: "會員管理", icon: Users },
  { href: "/admin/requests", label: "建立活動申請", icon: ClipboardCheck },
  { href: "/admin/codes", label: "一次性代碼", icon: KeyRound },
  { href: "/admin/events", label: "活動管理", icon: CalendarX },
  { href: "/admin/comments", label: "留言管理", icon: MessageSquare },
  { href: "/admin/chats", label: "聊天室管理", icon: MessagesSquare },
  { href: "/admin/reports", label: "檢舉案件", icon: Flag },
  { href: "/admin/blacklist", label: "黑名單管理", icon: ShieldBan },
  { href: "/admin/appeals", label: "帳號申訴", icon: ShieldQuestion },
  { href: "/admin/announcements", label: "全站公告", icon: Megaphone },
  { href: "/admin/logs", label: "操作日誌", icon: ScrollText },
  { href: "/admin/honors", label: "榮譽商城", icon: Sparkles },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-8 md:py-8">
      <aside className="shrink-0 md:w-56">
        <div className="card-surface sticky top-20 flex flex-col gap-1 rounded-2xl p-3">
          <p className="mb-1 px-2 text-xs font-bold text-coral-600">🛡️ 管理員後台</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-soft transition hover:bg-app-soft hover:text-main">
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
