"use client";

import {
  Activity,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Clock3,
  Compass,
  Copy,
  Flag,
  Grid2X2,
  Heart,
  Home,
  Image as ImageIcon,
  Info,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Map,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Moon,
  PartyPopper,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  UserPlus,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import CreateEventForm from "@/components/CreateEventForm";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role?: "member" | "admin";
  createdAt?: string;
};

type ApiEvent = {
  id: string;
  title: string;
  coverUrl: string;
  category: string;
  description: string;
  startAt: string;
  endAt: string;
  location: string;
  capacity: number;
  price: number;
  tags: string[];
  status: "active" | "cancelled" | "completed";
  attendeeCount: number;
  hostName: string;
};

type SiteStats = {
  members: number;
  events: number;
  upcomingEvents: number;
  participants: number;
  categories: Record<string, number>;
};

type SiteNotification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type EventItem = {
  id: string;
  startAt?: string;
  title: string;
  category: string;
  location: string;
  district: string;
  date: string;
  day: string;
  month: string;
  time: string;
  attendees: number;
  capacity: number;
  price: number;
  host: string;
  hostInitial: string;
  hostColor: string;
  status: string;
  statusTone: "hot" | "soon" | "new" | "full";
  description: string;
  tags: string[];
  cover: string;
  mapX: string;
  mapY: string;
};

type NavItem = {
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const navItems: NavItem[] = [
  { label: "首頁", icon: Home },
  { label: "探索活動", icon: Compass },
  { label: "地圖模式", icon: Map },
  { label: "我的收藏", icon: Bookmark },
  { label: "我的活動", icon: Ticket },
];

const utilityItems: NavItem[] = [
  { label: "通知中心", icon: Bell },
  { label: "個人設定", icon: Settings },
];

const categories = [
  { label: "全部活動", icon: Grid2X2, color: "all" },
  { label: "戶外探索", icon: Compass, color: "mint" },
  { label: "美食同好", icon: PartyPopper, color: "peach" },
  { label: "運動健身", icon: Zap, color: "yellow" },
  { label: "藝文手作", icon: Sparkles, color: "lavender" },
  { label: "桌遊娛樂", icon: Users, color: "blue" },
];

const events: EventItem[] = [
  {
    id: "forest-reset",
    title: "莫干山森林慢旅・一日療癒小旅行",
    category: "戶外探索",
    location: "新北市・三峽區",
    district: "新北市",
    date: "06/22",
    day: "22",
    month: "JUN",
    time: "09:00 - 18:00",
    attendees: 8,
    capacity: 12,
    price: 680,
    host: "米米去旅行",
    hostInitial: "米",
    hostColor: "#f0a58f",
    status: "即將額滿",
    statusTone: "hot",
    description:
      "把手機調成靜音，和一群剛好喜歡森林的人出發。這趟旅程會走進三峽秘境、享用山林午餐，留一點空白給自己，也認識幾位新朋友。",
    tags: ["新手友善", "含午餐", "輕健行"],
    cover:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85",
    mapX: "34%",
    mapY: "25%",
  },
  {
    id: "scent-lab",
    title: "週末香氛實驗室｜調一瓶專屬於你的香氣",
    category: "藝文手作",
    location: "台北市・大安區",
    district: "台北市",
    date: "06/21",
    day: "21",
    month: "JUN",
    time: "14:00 - 16:30",
    attendees: 5,
    capacity: 8,
    price: 980,
    host: "日常研究室",
    hostInitial: "日",
    hostColor: "#8bb4a8",
    status: "熱門活動",
    statusTone: "soon",
    description:
      "從香氣認識自己，挑選三種喜歡的氣味，完成一瓶只屬於你的香水。小班制，適合一個人來，也很適合想交朋友的你。",
    tags: ["小班制", "室內", "作品帶回家"],
    cover:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=1200&q=85",
    mapX: "56%",
    mapY: "42%",
  },
  {
    id: "boardgame-night",
    title: "週五深夜桌遊局｜新手也能玩到上癮",
    category: "桌遊娛樂",
    location: "台北市・中山區",
    district: "台北市",
    date: "06/20",
    day: "20",
    month: "JUN",
    time: "19:30 - 23:00",
    attendees: 10,
    capacity: 12,
    price: 250,
    host: "阿奇的遊戲室",
    hostInitial: "奇",
    hostColor: "#8798d8",
    status: "只剩 2 位",
    statusTone: "hot",
    description:
      "不用帶桌遊、不用怕不會玩，主揪會依照大家的個性與喜好配桌。今晚從歡樂派對遊戲開始，玩到捨不得回家。",
    tags: ["新手友善", "不限經驗", "供應飲品"],
    cover:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1200&q=85",
    mapX: "62%",
    mapY: "28%",
  },
  {
    id: "sunset-ride",
    title: "河濱單車日落團｜騎到風裡去",
    category: "運動健身",
    location: "新北市・八里區",
    district: "新北市",
    date: "06/29",
    day: "29",
    month: "JUN",
    time: "16:00 - 19:30",
    attendees: 15,
    capacity: 20,
    price: 0,
    host: "風裡的阿瑞",
    hostInitial: "瑞",
    hostColor: "#e2b464",
    status: "免費參加",
    statusTone: "new",
    description:
      "沿著淡水河岸慢慢騎，看橘色夕陽落進水面。全程平路、會在關渡大橋停留拍照，歡迎想開始運動的朋友。",
    tags: ["免費", "平路", "可租單車"],
    cover:
      "https://images.unsplash.com/photo-1529422643029-d4585747aaf2?auto=format&fit=crop&w=1200&q=85",
    mapX: "19%",
    mapY: "59%",
  },
  {
    id: "sea-yoga",
    title: "海邊瑜伽與早午餐｜讓週末慢下來",
    category: "運動健身",
    location: "宜蘭縣・頭城鎮",
    district: "宜蘭縣",
    date: "07/06",
    day: "06",
    month: "JUL",
    time: "08:30 - 12:30",
    attendees: 10,
    capacity: 14,
    price: 720,
    host: "慢慢生活提案",
    hostInitial: "慢",
    hostColor: "#9db9cb",
    status: "即將開始",
    statusTone: "soon",
    description:
      "在海風吹拂的早晨伸展身體，結束後一起享用在地早午餐。瑜伽老師會照顧每一位初學者，帶著舒服的心情回家。",
    tags: ["初學者", "海景", "含早午餐"],
    cover:
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=1200&q=85",
    mapX: "77%",
    mapY: "70%",
  },
  {
    id: "pasta-class",
    title: "一起學做義大利麵｜餐桌上的新朋友",
    category: "美食同好",
    location: "台中市・西區",
    district: "台中市",
    date: "07/13",
    day: "13",
    month: "JUL",
    time: "11:00 - 14:00",
    attendees: 5,
    capacity: 8,
    price: 1180,
    host: "小廚房日記",
    hostInitial: "廚",
    hostColor: "#d8957d",
    status: "新活動",
    statusTone: "new",
    description:
      "從揉麵、擀麵到完成一盤香氣四溢的義大利麵，邊做邊聊，最後坐在同一張餐桌分享成果。",
    tags: ["含食材", "一起吃飯", "手作"],
    cover:
      "https://images.unsplash.com/photo-1556761223-4c4282c73f77?auto=format&fit=crop&w=1200&q=85",
    mapX: "44%",
    mapY: "76%",
  },
];

function apiEventToCard(event: ApiEvent): EventItem {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const month = start.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const date = start.toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" }).replace("/", "/");
  const time = `${start.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${end.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  const progress = event.attendeeCount / Math.max(1, event.capacity);
  return {
    id: event.id,
    startAt: event.startAt,
    title: event.title,
    category: event.category,
    location: event.location,
    district: event.location.split("・")[0] ?? event.location,
    date,
    day: String(start.getDate()).padStart(2, "0"),
    month,
    time,
    attendees: event.attendeeCount,
    capacity: event.capacity,
    price: event.price,
    host: event.hostName,
    hostInitial: event.hostName.slice(0, 1),
    hostColor: "#78aeb7",
    status: progress >= 0.8 ? "即將額滿" : event.price === 0 ? "免費參加" : "即將開始",
    statusTone: progress >= 0.8 ? "hot" : "new",
    description: event.description,
    tags: event.tags,
    cover: event.coverUrl,
    mapX: "48%",
    mapY: "44%",
  };
}

function LogoMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      aria-label="揪好咖 logo"
      className={small ? "logo-mark logo-mark-small" : "logo-mark"}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="10" y1="10" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2C829B" />
          <stop offset="1" stopColor="#6DBDCE" />
        </linearGradient>
      </defs>
      <path d="M13.5 36.2C16.2 22.5 27.1 14 39.2 15.2C46.6 16 52 20.8 54.5 27.3" stroke="url(#logoGradient)" strokeWidth="4.2" strokeLinecap="round" />
      <path d="M50.8 39.3C47.5 50 38.4 55.2 28.8 53.7C20.3 52.5 14.8 46.3 12.6 39.5" stroke="url(#logoGradient)" strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="32" cy="13" r="7.1" fill="url(#logoGradient)" stroke="white" strokeWidth="2.2" />
      <circle cx="10.4" cy="34.2" r="6.1" fill="url(#logoGradient)" stroke="white" strokeWidth="2.2" />
      <circle cx="52.4" cy="38.2" r="5.8" fill="#68B6C8" stroke="white" strokeWidth="2.2" />
      <circle cx="32" cy="53.2" r="6.1" fill="url(#logoGradient)" stroke="white" strokeWidth="2.2" />
      <path d="M45.2 12.8C45.2 8.8 48 6 51.6 6C55.4 6 58 8.8 58 12.4C58 17.8 51.6 23.3 51.6 23.3C51.6 23.3 45.2 17.7 45.2 12.8Z" fill="#9CB3BA" />
      <circle cx="51.6" cy="12.6" r="2.7" fill="white" />
    </svg>
  );
}

function EventCard({
  event,
  isFavorite,
  onFavorite,
  onOpen,
}: {
  event: EventItem;
  isFavorite: boolean;
  onFavorite: (eventId: string) => void;
  onOpen: (event: EventItem) => void;
}) {
  const progress = Math.min(100, Math.round((event.attendees / event.capacity) * 100));
  return (
    <article className="event-card" onClick={() => onOpen(event)}>
      <div className="event-cover" style={{ backgroundImage: `url(${event.cover})` }}>
        <div className="cover-scrim" />
        <span className={`event-status status-${event.statusTone}`}>
          {event.statusTone === "hot" && <FlameIcon />}
          {event.statusTone === "new" && <Sparkles size={12} />}
          {event.status}
        </span>
        <button
          className={`favorite-button ${isFavorite ? "is-favorite" : ""}`}
          aria-label={isFavorite ? "取消收藏" : "收藏活動"}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(event.id);
          }}
        >
          <Bookmark size={18} strokeWidth={2} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <div className="date-badge">
          <strong>{event.day}</strong>
          <span>{event.month}</span>
        </div>
      </div>
      <div className="event-info">
        <div className="event-category-row">
          <span className="event-category">{event.category}</span>
          <span className="event-price">{event.price === 0 ? "免費" : `NT$ ${event.price.toLocaleString()}`}</span>
        </div>
        <h3>{event.title}</h3>
        <div className="event-meta-line">
          <CalendarDays size={14} />
          <span>{event.date} · {event.time}</span>
        </div>
        <div className="event-meta-line">
          <MapPin size={14} />
          <span>{event.location}</span>
        </div>
        <div className="event-card-footer">
          <div className="host-chip">
            <span className="mini-avatar" style={{ background: event.hostColor }}>{event.hostInitial}</span>
            <span>{event.host}</span>
            <span className="verified-dot"><Check size={9} /></span>
          </div>
          <div className="capacity-wrap">
            <div className="capacity-label"><Users size={13} /> {event.attendees}/{event.capacity}</div>
            <div className="capacity-bar"><span style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </div>
    </article>
  );
}

function FlameIcon() {
  return <span className="flame-icon">✦</span>;
}

function CalendarWidget({ items }: { items: EventItem[] }) {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const eventDays = new Set(items.flatMap((item) => {
    if (!item.startAt) return [];
    const date = new Date(item.startAt);
    return date.getFullYear() === year && date.getMonth() === month ? [date.getDate()] : [];
  }));
  const calendarCells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const upcomingCount = items.filter((item) => item.startAt && new Date(item.startAt) >= today).length;
  return (
    <div className="calendar-card panel-card">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">你的行事曆</span>
          <h3>{today.toLocaleDateString("zh-TW", { year: "numeric", month: "long" })}</h3>
        </div>
        <div className="calendar-arrows">
          <button aria-label="上個月"><ChevronLeft size={15} /></button>
          <button aria-label="下個月"><ChevronRight size={15} /></button>
        </div>
      </div>
      <div className="calendar-weekdays">{days.map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {calendarCells.map((number, index) => (
          <span key={`${number ?? "blank"}-${index}`} className={`${number === today.getDate() ? "today" : ""} ${typeof number === "number" && eventDays.has(number) ? "has-event" : ""}`}>
            {number ?? ""}
          </span>
        ))}
      </div>
      <div className="calendar-note"><span className="calendar-dot" /> {upcomingCount > 0 ? `你有 ${upcomingCount} 個活動即將開始` : "目前沒有即將開始的活動"}</div>
    </div>
  );
}

function formatTodayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date).toUpperCase();
}

function isInCurrentWeek(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function isInNextMonth(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const followingMonth = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  return date >= nextMonth && date < followingMonth;
}

function formatEventDate(value?: string, fallback?: string) {
  if (!value) return fallback ?? "日期待確認";
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(value));
}

function MapSection({ onOpen, items = [] }: { onOpen: (event: EventItem) => void; items?: EventItem[] }) {
  return (
    <section className="map-page-section">
      <div className="section-heading map-heading">
        <div>
          <span className="eyebrow">NEARBY GATHERINGS</span>
          <h1>附近的好咖，都在這裡</h1>
          <p>探索你所在位置周邊，正在發生的有趣活動。</p>
        </div>
        <button className="soft-button"><MapPin size={15} /> 台北市 <ChevronDown size={14} /></button>
      </div>
      <div className="map-layout">
        <div className="map-canvas">
          <div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-road road-d" />
          <div className="map-river" />
          <span className="map-place place-a">大安森林公園</span><span className="map-place place-b">中山商圈</span><span className="map-place place-c">信義計畫區</span><span className="map-place place-d">松山</span>
          <div className="location-pulse"><span /></div>
          {items.map((event, index) => (
            <button key={event.id} className={`map-marker ${index === 0 ? "featured" : ""}`} style={{ left: event.mapX, top: event.mapY }} onClick={() => onOpen(event)} aria-label={`查看 ${event.title}`}>
              <span>{index === 0 ? "✦" : ""}</span>
            </button>
          ))}
          <div className="map-control"><button><Plus size={16} /></button><button><span className="minus">−</span></button><button className="locate"><MapPin size={15} /></button></div>
          <div className="map-scale">500 m</div>
        </div>
        <div className="map-results">
          <div className="map-results-heading"><strong>附近活動</strong><span>{items.length} 個結果</span></div>
          {items.slice(0, 4).map((event) => (
            <button className="map-result" key={event.id} onClick={() => onOpen(event)}>
              <div className="map-result-image" style={{ backgroundImage: `url(${event.cover})` }} />
              <div><span>{event.category}</span><strong>{event.title}</strong><small><MapPin size={12} /> {event.location}</small></div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [activeNav, setActiveNav] = useState("首頁");
  const [activeCategory, setActiveCategory] = useState("全部活動");
  const [activeTab, setActiveTab] = useState("為你推薦");
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("地區");
  const [dateFilter, setDateFilter] = useState("日期");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const [siteStats, setSiteStats] = useState<SiteStats>({ members: 0, events: 0, upcomingEvents: 0, participants: 0, categories: {} });
  const [notifications, setNotifications] = useState<SiteNotification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [joined, setJoined] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [verificationType, setVerificationType] = useState<"code" | "request">("code");
  const [accessCode, setAccessCode] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("joinjoy-theme");
    if (storedTheme === "dark" || storedTheme === "light") setDarkMode(storedTheme === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    window.localStorage.setItem("joinjoy-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  async function loadLiveEvents() {
    try {
      const response = await fetch("/api/events", { credentials: "include" });
      if (!response.ok) return;
      const data = (await response.json()) as { events?: ApiEvent[] };
      setLiveEvents((data.events ?? []).map(apiEventToCard));
    } catch {
      setLiveEvents([]);
    }
  }

  async function loadSiteStats() {
    try {
      const response = await fetch("/api/site-stats", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { stats?: SiteStats };
      if (data.stats) setSiteStats(data.stats);
    } catch {
      // The interface remains usable while statistics are loading.
    }
  }

  async function loadNotifications() {
    if (!authUser) {
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }
    try {
      const response = await fetch("/api/notifications", { credentials: "include", cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications?: SiteNotification[]; unread?: number };
      setNotifications(data.notifications ?? []);
      setUnreadNotifications(data.unread ?? 0);
    } catch {
      setNotifications([]);
      setUnreadNotifications(0);
    }
  }

  useEffect(() => {
    void loadLiveEvents();
    void loadSiteStats();
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [authUser]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { user?: AuthUser | null };
        return data.user ?? null;
      })
      .then((user) => {
        if (active) setAuthUser(user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const allEvents = liveEvents;

  const filteredEvents = useMemo(() => {
    let result = allEvents.filter((event) => {
      const matchesQuery = !query || `${event.title} ${event.location} ${event.category} ${event.host} ${event.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = activeCategory === "全部活動" || event.category === activeCategory;
      const matchesRegion = region === "地區" || event.district === region;
      const matchesDate = dateFilter === "日期" || (dateFilter === "本週" ? isInCurrentWeek(event.startAt) : isInNextMonth(event.startAt));
      return matchesQuery && matchesCategory && matchesRegion && matchesDate;
    });
    if (activeTab === "熱門活動") result = [...result].sort((a, b) => b.attendees / b.capacity - a.attendees / a.capacity);
    if (activeTab === "最新加入") result = [...result].reverse();
    return result;
  }, [activeCategory, activeTab, allEvents, dateFilter, query, region]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  async function markNotificationsRead() {
    if (!authUser) {
      openAuth();
      return;
    }
    const response = await fetch("/api/notifications", { method: "PATCH", credentials: "include" });
    if (response.ok) {
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadNotifications(0);
    }
  }

  function openAuth(mode: "login" | "register" = "login") {
    setAuthMode(mode);
    setAuthError(null);
    setShowPassword(false);
    setShowAccountMenu(false);
    setShowAuthModal(true);
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authSubmitting) return;
    setAuthError(null);
    setAuthSubmitting(true);

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = authMode === "login"
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { user?: AuthUser; message?: string };

      if (!response.ok || !data.user) {
        setAuthError(data.message ?? "操作失敗，請稍後再試");
        return;
      }

      setAuthUser(data.user);
      setShowAuthModal(false);
      setAuthPassword("");
      setAuthError(null);
      notify(authMode === "login" ? `歡迎回來，${data.user.name}` : "帳號建立成功，歡迎加入揪好咖！");
    } catch {
      setAuthError("目前無法連線到伺服器，請確認專案與資料庫已啟動");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setShowAccountMenu(false);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      setAuthUser(null);
      notify("你已安全登出");
    }
  }

  function toggleFavorite(id: string) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    notify(favorites.includes(id) ? "已取消收藏" : "已加入收藏，之後再來看看吧！");
  }

  function handleJoin() {
    if (!selectedEvent) return;
    setJoined((current) => current.includes(selectedEvent.id) ? current.filter((id) => id !== selectedEvent.id) : [...current, selectedEvent.id]);
    notify(joined.includes(selectedEvent.id) ? "已退出這場活動" : "報名成功！活動資訊已加入你的行事曆");
  }

  function handleNav(label: string) {
    if (label === "個人設定") {
      window.location.href = "/settings";
      return;
    }
    if (label === "我的收藏" || label === "我的活動") {
      window.location.href = "/profile";
      return;
    }
    setActiveNav(label);
    setMobileMenuOpen(false);
    if (label === "地圖模式") setMapMode(true);
    else setMapMode(false);
    if (label === "通知中心") {
      setShowNotifications(true);
      void loadNotifications();
    }
  }

  async function handleCreateSubmit() {
    if (!authUser) {
      setShowCreateModal(false);
      openAuth();
      return;
    }
    if (verificationType === "code") {
      if (accessCode.trim().length !== 6) {
        notify("請輸入 6 碼建立活動驗證碼");
        return;
      }
      setShowCreateModal(false);
      setShowEventForm(true);
      return;
    }
    try {
      const response = await fetch("/api/create-requests", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ reason: "我想發起一場有內容、尊重參與者並遵守社群規範的活動。" }) });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        notify(data.message ?? "申請送出失敗");
        return;
      }
      setShowCreateModal(false);
      notify("建立活動申請已送出，管理員會在通知中心回覆");
    } catch {
      notify("目前無法送出申請，請稍後再試");
    }
  }

  const pageTitle = activeNav === "首頁" ? "今天，想和誰一起出發？" : activeNav === "探索活動" ? "探索適合你的活動" : activeNav === "我的收藏" ? "收藏的活動" : activeNav === "我的活動" ? "我的活動足跡" : "今天，想和誰一起出發？";

  return (
    <div className={`app-shell ${mobileMenuOpen ? "menu-open" : ""}`}>
      {isLoading && (
        <div className="loading-screen">
          <div className="loading-mark-wrap"><LogoMark /><span className="loading-ring" /></div>
          <h1>揪好咖</h1>
          <p>正在為你找尋好咖</p>
          <div className="loading-dots"><span /><span /><span /></div>
        </div>
      )}
      <div className="ambient ambient-left" /><div className="ambient ambient-right" />
      <aside className="sidebar">
        <div className="brand-row">
          <button className="brand" onClick={() => handleNav("首頁")} aria-label="回到首頁"><LogoMark small /><span>揪好咖</span><small>JOINJOY</small></button>
          <button className="sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="關閉選單"><X size={19} /></button>
        </div>
        <div className="sidebar-scroll">
          <div className="nav-block">
            <span className="nav-caption">探索</span>
            {navItems.map(({ label, icon: Icon, badge }) => {
              const count = label === "探索活動" ? siteStats.events : badge;
              return <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => handleNav(label)}>
                <Icon size={18} strokeWidth={activeNav === label ? 2.4 : 1.9} /><span>{label}</span>{count !== undefined && <em>{count}</em>}
              </button>;
            })}
          </div>
          <div className="nav-block utility-block">
            <span className="nav-caption">其他</span>
            {utilityItems.map(({ label, icon: Icon, badge }) => {
              const count = label === "通知中心" ? unreadNotifications : undefined;
              return <button key={label} className={`nav-item ${activeNav === label ? "active" : ""}`} onClick={() => handleNav(label)}>
                <Icon size={18} strokeWidth={activeNav === label ? 2.4 : 1.9} /><span>{label}</span>{count !== undefined && count > 0 && <em className="notification-badge">{count}</em>}
              </button>;
            })}
          </div>
          <div className="sidebar-tip">
            <div className="tip-spark"><Sparkles size={17} /></div>
            <strong>發現你的下一個<br />有趣週末</strong>
            <p>依照你的喜好，推薦剛剛好的活動。</p>
            <button onClick={() => { setActiveTab("為你推薦"); setActiveNav("首頁"); }}>看看推薦 <ArrowUpRight size={14} /></button>
          </div>
        </div>
        <div className="sidebar-profile">
          <div className="profile-avatar">{authUser ? authUser.name.slice(0, 1).toUpperCase() : <UserRound size={15} />}<span /></div>
          <div className="sidebar-profile-copy"><strong>{authLoading ? "讀取中..." : authUser?.name ?? "尚未登入"}</strong><span>{authUser ? "探索者 Lv.3" : "登入後開始探索"}</span></div>
          <button aria-label={authUser ? "個人選單" : "登入帳號"} onClick={() => authUser ? setShowAccountMenu((value) => !value) : openAuth()}>{authUser ? <MoreHorizontal size={18} /> : <LogIn size={17} />}</button>
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <div className="topbar-start">
            <button className="mobile-menu-button" onClick={() => setMobileMenuOpen(true)} aria-label="開啟選單"><Menu size={21} /></button>
            <div className="breadcrumb"><span>探索</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          </div>
          <div className="top-actions">
            <button className="theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label="切換深色模式">
              {darkMode ? <Sparkles size={17} /> : <Moon size={17} />}<span>{darkMode ? "亮色" : "深色"}</span>
            </button>
            <div className="notification-wrap">
              <button className="icon-button notification-button" onClick={() => setShowNotifications((value) => !value)} aria-label="通知中心"><Bell size={19} />{unreadNotifications > 0 && <i />}</button>
              {showNotifications && (
                <div className="notification-panel">
                  <div className="notification-head"><div><span className="eyebrow">UPDATES</span><h3>通知中心</h3></div><button onClick={() => void markNotificationsRead()}><Check size={15} /> 全部已讀</button></div>
                  {notifications.length > 0 ? notifications.slice(0, 3).map((notification, index) => <div className={`notification-item ${notification.readAt ? "" : "unread"}`} key={notification.id}><span className={`notification-icon ${["peach", "mint", "lavender"][index % 3]}`}><Bell size={15} /></span><div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString("zh-TW")}</small></div></div>) : <div className="notification-empty">目前沒有通知</div>}
                  <button className="notification-footer" onClick={() => handleNav("通知中心")}>查看所有通知 <ChevronRight size={14} /></button>
                </div>
              )}
            </div>
            <div className="account-wrap">
              <button className="top-profile account-trigger" onClick={() => authUser ? setShowAccountMenu((value) => !value) : openAuth()} aria-label="帳號選單" aria-expanded={showAccountMenu}>
                <div className="top-avatar">{authUser ? authUser.name.slice(0, 1).toUpperCase() : <UserRound size={15} />}</div>
                <div><strong>{authLoading ? "讀取中..." : authUser?.name ?? "尚未登入"}</strong><span>{authUser ? "探索者" : "登入帳號"}</span></div>
                <ChevronDown size={15} />
              </button>
              {showAccountMenu && (
                <div className="account-menu">
                  {authUser ? (
                    <>
                      <div className="account-menu-head"><div className="account-menu-avatar">{authUser.name.slice(0, 1).toUpperCase()}</div><div><strong>{authUser.name}</strong><span>{authUser.email}</span></div><button className="account-head-logout" onClick={() => void handleLogout()}><LogOut size={14} /> 登出</button></div>
                      <button onClick={() => { window.location.href = "/profile"; }}><UserRound size={15} /> 個人資料</button>
                      <button onClick={() => { window.location.href = "/settings"; }}><Settings size={15} /> 個人設定</button>
                      {authUser.role === "admin" && <button onClick={() => { window.location.href = "/admin"; }}><ShieldCheck size={15} /> 管理員後台</button>}
                    </>
                  ) : (
                    <>
                      <div className="account-menu-head"><div className="account-menu-avatar guest"><UserRound size={16} /></div><div><strong>登入揪好咖</strong><span>同步收藏與活動紀錄</span></div></div>
                      <button onClick={() => openAuth("login")}><LogIn size={15} /> 登入帳號</button>
                      <button onClick={() => openAuth("register")}><UserPlus size={15} /> 建立新帳號</button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          {!mapMode && activeNav !== "通知中心" && (
            <>
              <section className="page-intro">
                <div><span className="eyebrow">{formatTodayLabel()}</span><h1>{pageTitle}</h1><p>和剛剛好的人，去做剛剛好的事。</p></div>
                <button className="create-event-button" onClick={() => authUser ? setShowCreateModal(true) : openAuth()}><Plus size={18} /> 建立活動</button>
              </section>

              <section className="hero-banner">
                <div className="hero-copy">
                  <span className="hero-kicker"><Sparkles size={13} /> 本週精選</span>
                  <h2>把喜歡的事，<br /><em>變成一起的事。</em></h2>
                  <p>目前有 {siteStats.events.toLocaleString()} 個正在發生的活動，<br />找到和你頻率相同的好咖。</p>
                  <button onClick={() => { setActiveTab("熱門活動"); document.getElementById("events-section")?.scrollIntoView({ behavior: "smooth" }); }}>探索熱門活動 <ArrowUpRight size={16} /></button>
                </div>
                <div className="hero-visual">
                  <div className="hero-image hero-image-back" />
                  <div className="hero-image hero-image-front"><div className="hero-image-caption"><span>今日推薦</span><strong>一起去山裡走走吧</strong><small><MapPin size={11} /> 三峽 · 新北市</small></div></div>
                  <div className="hero-floating-card"><span className="floating-avatars"><i>米</i><i>安</i><i>J</i><b>+9</b></span><strong>12 位好咖<br /><small>也感興趣</small></strong></div>
                  <div className="hero-sun" />
                </div>
                <div className="hero-decoration decor-dot-one" /><div className="hero-decoration decor-dot-two" /><div className="hero-decoration decor-star">✦</div>
              </section>

              <section className="search-panel">
                <div className="search-input-wrap"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜尋活動、地點、主辦人或關鍵字..." /><kbd>⌘ K</kbd></div>
                <div className="filter-divider" />
                <div className="select-filter"><MapPin size={16} /><select value={region} onChange={(e) => setRegion(e.target.value)}><option value="地區">地區</option><option value="台北市">台北市</option><option value="新北市">新北市</option><option value="宜蘭縣">宜蘭縣</option><option value="台中市">台中市</option></select><ChevronDown size={14} /></div>
                <div className="select-filter"><CalendarDays size={16} /><select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}><option value="日期">日期</option><option value="本週">本週</option><option value="下個月">下個月</option></select><ChevronDown size={14} /></div>
                <button className={`filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={17} /> <span>更多篩選</span><i>{(region !== "地區" ? 1 : 0) + (dateFilter !== "日期" ? 1 : 0)}</i></button>
                {filtersOpen && <div className="advanced-filter-popover"><div><label>活動類型</label><button>全部類型 <ChevronDown size={13} /></button></div><div><label>費用</label><button>不限費用 <ChevronDown size={13} /></button></div><div><label>剩餘名額</label><button>仍有名額 <ChevronDown size={13} /></button></div><button className="apply-filter" onClick={() => { setFiltersOpen(false); notify("篩選條件已套用"); }}>套用篩選</button></div>}
              </section>

              <section className="category-section">
                <div className="section-heading compact"><div><span className="eyebrow">EXPLORE BY MOOD</span><h2>今天想做什麼？</h2></div><button className="text-button" onClick={() => { setActiveCategory("全部活動"); setActiveNav("探索活動"); }}>查看全部 <ArrowUpRight size={14} /></button></div>
                <div className="category-list">{categories.map(({ label, icon: Icon, color }) => { const count = label === "全部活動" ? siteStats.events : siteStats.categories[label] ?? 0; return <button key={label} onClick={() => setActiveCategory(label)} className={`category-pill category-${color} ${activeCategory === label ? "active" : ""}`}><span><Icon size={20} /></span><strong>{label}</strong><small>{count.toLocaleString()} 個活動</small></button>; })}</div>
              </section>

              <div className="feed-layout" id="events-section">
                <section className="event-feed">
                  <div className="section-heading feed-heading"><div><span className="eyebrow">JUST FOR YOU</span><h2>{activeCategory === "全部活動" ? "為你挑選的活動" : activeCategory}</h2></div><div className="feed-tabs">{["為你推薦", "熱門活動", "最新加入"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div></div>
                  {filteredEvents.length > 0 ? <div className="events-grid">{filteredEvents.map((event) => <EventCard key={event.id} event={event} isFavorite={favorites.includes(event.id)} onFavorite={toggleFavorite} onOpen={setSelectedEvent} />)}</div> : <div className="empty-state"><Search size={30} /><h3>還找不到這樣的活動</h3><p>試著換個關鍵字或放寬篩選條件吧。</p><button onClick={() => { setQuery(""); setActiveCategory("全部活動"); setRegion("地區"); setDateFilter("日期"); }}>清除篩選</button></div>}
                </section>
                <aside className="right-rail"><CalendarWidget items={allEvents} /><div className="upcoming-card panel-card"><div className="panel-heading"><div><span className="eyebrow">COMING UP</span><h3>即將開始</h3></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="upcoming-list">{allEvents.length > 0 ? allEvents.slice(0, 3).map((event, index) => <button key={event.id} className="upcoming-item" onClick={() => setSelectedEvent(event)}><span className={`upcoming-date date-${index}`}><strong>{event.day}</strong><small>{event.month}</small></span><span className="upcoming-copy"><strong>{event.title}</strong><small><Clock3 size={12} /> {event.time.split(" ")[0]} · {event.location.split("・")[0]}</small></span><ChevronRight size={15} /></button>) : <div className="upcoming-empty">目前沒有即將開始的活動</div>}</div><button className="view-calendar" onClick={() => notify("行事曆已同步更新")}>查看我的行事曆 <ArrowUpRight size={14} /></button></div><div className="ai-card"><div className="ai-orbit"><Sparkles size={18} /></div><div><span className="eyebrow">JOINJOY AI</span><h3>不知道要去哪裡？</h3><p>讓 AI 依照你的喜好，找到下一個剛好。</p><button onClick={() => notify("AI 正在分析你的興趣與足跡...")}>幫我推薦 <ArrowUpRight size={14} /></button></div></div></aside>
              </div>
            </>
          )}
          {mapMode && <MapSection items={allEvents} onOpen={setSelectedEvent} />}
          {activeNav === "通知中心" && !mapMode && <div className="notification-page"><div className="section-heading"><div><span className="eyebrow">YOUR UPDATES</span><h1>通知中心</h1><p>掌握每一個和好咖有關的最新消息。</p></div><button className="soft-button" onClick={() => void markNotificationsRead()}><Check size={15} /> 全部標記已讀</button></div><div className="full-notification-list">{notifications.length > 0 ? notifications.map((notification, index) => <div className={`full-notification ${notification.readAt ? "" : "unread"}`} key={notification.id}><span className={`notification-icon ${["peach", "mint", "lavender", "blue"][index % 4]}`}><Bell size={17} /></span><div><strong>{notification.title}</strong><p>{notification.body}</p><small>{new Date(notification.createdAt).toLocaleString("zh-TW")}</small></div><button><MoreHorizontal size={18} /></button></div>) : <div className="admin-empty">目前沒有通知</div>}</div></div>}
        </main>
      </div>

      <nav className="mobile-bottom-nav"><button className={activeNav === "首頁" ? "active" : ""} onClick={() => handleNav("首頁")}><Home size={19} /><span>首頁</span></button><button className={activeNav === "探索活動" ? "active" : ""} onClick={() => handleNav("探索活動")}><Compass size={19} /><span>探索</span></button><button className="mobile-add" onClick={() => authUser ? setShowCreateModal(true) : openAuth()}><Plus size={21} /></button><button className={activeNav === "地圖模式" ? "active" : ""} onClick={() => handleNav("地圖模式")}><Map size={19} /><span>地圖</span></button><button onClick={() => authUser ? setShowAccountMenu((value) => !value) : openAuth()}><UserRound size={19} /><span>{authUser ? "帳號" : "登入"}</span></button></nav>

      {showAuthModal && <div className="modal-backdrop" onClick={() => setShowAuthModal(false)}><div className="auth-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close plain-close auth-close" onClick={() => setShowAuthModal(false)} aria-label="關閉登入視窗"><X size={18} /></button><div className="auth-brand"><LogoMark small /><span>揪好咖 <b>JOINJOY</b></span></div><div className="auth-heading"><span className="eyebrow">{authMode === "login" ? "WELCOME BACK" : "JOIN THE COMMUNITY"}</span><h2>{authMode === "login" ? "歡迎回到揪好咖" : "建立你的好咖帳號"}</h2><p>{authMode === "login" ? "登入後同步你的收藏、報名與活動紀錄。" : "和剛剛好的人，一起出發去做喜歡的事。"}</p></div><div className="auth-mode-switch"><button className={authMode === "login" ? "active" : ""} type="button" onClick={() => { setAuthMode("login"); setAuthError(null); }}>登入</button><button className={authMode === "register" ? "active" : ""} type="button" onClick={() => { setAuthMode("register"); setAuthError(null); }}>註冊</button></div><form className="auth-form" onSubmit={handleAuthSubmit}>{authMode === "register" && <label><span>你的暱稱</span><div className="auth-input"><UserRound size={16} /><input value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="例如：Yuki Chen" autoComplete="name" required /></div></label>}<label><span>Email</span><div className="auth-input"><Mail size={16} /><input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="hello@example.com" autoComplete="email" required /></div></label><label><span>密碼</span><div className="auth-input"><LockKeyhole size={16} /><input type={showPassword ? "text" : "password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === "register" ? "至少 8 個字元" : "輸入你的密碼"} autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={authMode === "register" ? 8 : undefined} required /><button type="button" className="password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{authError && <div className="auth-error"><Info size={14} /><span>{authError}</span></div>}<button className="auth-submit" type="submit" disabled={authSubmitting}>{authSubmitting ? <><span className="button-spinner" />處理中...</> : <>{authMode === "login" ? "登入揪好咖" : "建立我的帳號"}<ArrowUpRight size={16} /></>}</button></form>{authMode === "login" && <button className="forgot-password" type="button" onClick={() => notify("忘記密碼功能即將開放")}>忘記密碼？</button>}<div className="auth-security"><ShieldCheck size={14} /><span>我們會使用安全加密保護你的帳號資料</span></div><p className="auth-switch-copy">{authMode === "login" ? "還沒有帳號？" : "已經有帳號了？"}<button type="button" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(null); }}>{authMode === "login" ? "立即註冊" : "返回登入"}</button></p></div></div>}

      <CreateEventForm open={showEventForm} accessCode={accessCode} onClose={() => setShowEventForm(false)} onSuccess={(message) => { setShowEventForm(false); setAccessCode(""); void loadLiveEvents(); notify(message); }} />

      {selectedEvent && <div className="modal-backdrop" onClick={() => setSelectedEvent(null)}><div className="event-modal" onClick={(e) => e.stopPropagation()}><div className="modal-cover" style={{ backgroundImage: `url(${selectedEvent.cover})` }}><div className="modal-cover-shade" /><button className="modal-close" onClick={() => setSelectedEvent(null)} aria-label="關閉"><X size={19} /></button><span className={`event-status status-${selectedEvent.statusTone}`}>{selectedEvent.status}</span><div className="modal-cover-title"><span>{selectedEvent.category}</span><h2>{selectedEvent.title}</h2></div></div><div className="modal-body"><div className="modal-host-row"><div className="modal-host"><span className="host-avatar-large" style={{ background: selectedEvent.hostColor }}>{selectedEvent.hostInitial}</span><div><small>主辦人</small><strong>{selectedEvent.host} <span className="verified-text"><CheckCircle2 size={13} /> 已驗證</span></strong></div></div><div className="modal-actions"><button onClick={() => toggleFavorite(selectedEvent.id)} className={favorites.includes(selectedEvent.id) ? "active" : ""}><Bookmark size={17} fill={favorites.includes(selectedEvent.id) ? "currentColor" : "none"} /></button><button onClick={() => notify("活動連結已複製，可以分享給好咖了") }><Share2 size={17} /></button><button onClick={() => notify("檢舉功能已開啟") }><Flag size={17} /></button></div></div><div className="modal-info-grid"><div><CalendarDays size={17} /><span><small>活動時間</small><strong>{formatEventDate(selectedEvent.startAt, selectedEvent.date)} · {selectedEvent.time}</strong></span></div><div><MapPin size={17} /><span><small>集合地點</small><strong>{selectedEvent.location}</strong></span></div><div><Users size={17} /><span><small>目前人數</small><strong>{selectedEvent.attendees} 人 · 尚有 {selectedEvent.capacity - selectedEvent.attendees} 位</strong></span></div><div><Ticket size={17} /><span><small>活動費用</small><strong>{selectedEvent.price === 0 ? "免費參加" : `NT$ ${selectedEvent.price.toLocaleString()} / 人`}</strong></span></div></div><div className="modal-description"><h3>關於這場活動</h3><p>{selectedEvent.description}</p><div className="tag-list">{selectedEvent.tags.map((tag) => <span key={tag}># {tag}</span>)}</div></div><div className="modal-chat-preview"><div className="chat-preview-head"><span><MessageCircle size={15} /> 活動聊天室</span><small>12 位成員</small></div><div className="chat-message"><span className="chat-avatar">安</span><p><strong>小安</strong> 大家好！很期待週末和大家見面 ☺</p></div></div><div className="modal-footer"><button className={`join-button ${joined.includes(selectedEvent.id) ? "joined" : ""}`} onClick={handleJoin}>{joined.includes(selectedEvent.id) ? <><CheckCircle2 size={18} /> 已報名，期待見面</> : <>加入這場活動 <ArrowUpRight size={17} /></>}</button><button className="chat-button" onClick={() => notify("聊天室已開啟") }><MessageCircle size={18} /></button></div></div></div></div>}

      {showCreateModal && <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}><div className="create-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close plain-close" onClick={() => setShowCreateModal(false)}><X size={18} /></button><div className="create-modal-top"><div className="create-icon"><Plus size={21} /></div><span className="eyebrow">CREATE A GATHERING</span><h2>發起一場好咖活動</h2><p>每個美好聚會，都從一個念頭開始。</p></div><div className="permission-note"><ShieldCheck size={19} /><div><strong>為了讓社群更安心</strong><p>建立活動前，需要先完成一次權限驗證。每次驗證僅能建立一場活動。</p></div></div><div className="create-step"><span className="step-number active">01</span><div><strong>取得建立活動權限</strong><small>選擇一種你方便的驗證方式</small></div></div><div className="verification-options"><button className={verificationType === "code" ? "active" : ""} onClick={() => setVerificationType("code")}><span className="verification-radio">{verificationType === "code" && <i />}</span><LockKeyhole size={19} /><span><strong>輸入一次性代碼</strong><small>輸入管理員提供的 6 碼代碼</small></span><ChevronRight size={15} /></button><button className={verificationType === "request" ? "active" : ""} onClick={() => setVerificationType("request")}><span className="verification-radio">{verificationType === "request" && <i />}</span><Send size={19} /><span><strong>送出建立申請</strong><small>管理員審核同意後即可建立</small></span><ChevronRight size={15} /></button></div>{verificationType === "code" ? <div className="code-entry"><label>一次性建立代碼 <span>CODE</span></label><div className="code-input-wrap"><input value={accessCode} onChange={(e) => setAccessCode(e.target.value.toUpperCase())} maxLength={6} placeholder="輸入 6 碼代碼" /><Copy size={16} /></div><small><Info size={13} /> 代碼使用後會立即失效，請妥善保管。</small></div> : <div className="request-message"><ImageIcon size={20} /><p>送出申請後，請在個人通知中心查看審核結果。通常會在 1–2 個工作天內完成。</p></div>}<button className="submit-create" onClick={handleCreateSubmit}>{verificationType === "code" ? "驗證並開始建立" : "送出建立申請"}<ArrowUpRight size={17} /></button><p className="create-help"><CircleHelp size={13} /> 需要幫助？查看建立活動指南</p></div></div>}

      {toast && <div className="toast"><span><Check size={15} /></span>{toast}</div>}
    </div>
  );
}
