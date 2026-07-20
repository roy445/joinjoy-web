export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()} (週${weekday})`;
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "剛剛";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return d.toLocaleDateString("zh-TW");
}

export function eventStatusLabel(status: string) {
  const map: Record<string, string> = {
    upcoming: "即將開始",
    ongoing: "進行中",
    completed: "已結束",
    cancelled: "已取消",
  };
  return map[status] ?? status;
}

export function genderLimitLabel(v: string) {
  const map: Record<string, string> = { any: "不限性別", male: "限男性", female: "限女性" };
  return map[v] ?? v;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizeText(input: string, max = 5000) {
  return input.replace(/<[^>]*>/g, "").trim().slice(0, max);
}

export function creditLabel(score: number) {
  if (score >= 95) return { label: "極高信任", color: "text-emerald-600" };
  if (score >= 80) return { label: "信任良好", color: "text-teal-600" };
  if (score >= 60) return { label: "普通", color: "text-amber-600" };
  return { label: "低信任", color: "text-rose-600" };
}
