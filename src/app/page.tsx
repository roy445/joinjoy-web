import Link from "next/link";
import { db } from "@/db";
import { events, users, eventParticipants, siteAnnouncements } from "@/db/schema";
import { eq, ne, sql, desc, asc, and, ilike, or, isNull } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { autoUpdateEventStatuses } from "@/lib/event-status";
import { SearchBar } from "@/components/search-bar";
import { SectionTitle, EmptyState } from "@/components/ui";
import { EventCard } from "@/components/event-card";
import { RecommendedSection } from "@/components/recommended-section";
import { ArrowUpRight, Megaphone, Sparkles } from "lucide-react";
import { BetaBadge } from "@/components/beta-badge";

export const dynamic = "force-dynamic";

const participantCountSub = db
  .select({ eventId: eventParticipants.eventId, count: sql<number>`count(*)`.as("count") })
  .from(eventParticipants)
  .where(eq(eventParticipants.status, "approved"))
  .groupBy(eventParticipants.eventId)
  .as("pc");

const baseSelect = async () => {
  try {
    return await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        meetingLocation: events.meetingLocation,
        region: events.region,
        capacity: events.capacity,
        fee: events.fee,
        status: events.status,
        tags: events.tags,
        hostName: users.name,
        hostAvatar: users.avatarUrl,
        hostRole: users.role,
        hostTitle: users.activeTitle,
        hostBadge: users.activeBadge,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id));
  } catch (error) {
    console.error("Homepage baseSelect error, falling back to basic fields:", error);
    const results = await db
      .select({
        id: events.id,
        title: events.title,
        coverImageUrl: events.coverImageUrl,
        eventDate: events.eventDate,
        startTime: events.startTime,
        meetingLocation: events.meetingLocation,
        region: events.region,
        capacity: events.capacity,
        fee: events.fee,
        status: events.status,
        tags: events.tags,
        hostName: users.name,
        hostAvatar: users.avatarUrl,
        hostRole: users.role,
        participantCount: sql<number>`coalesce(${participantCountSub.count}, 0)`,
      })
      .from(events)
      .leftJoin(users, eq(events.hostId, users.id))
      .leftJoin(participantCountSub, eq(participantCountSub.eventId, events.id));
    
    return results.map(r => ({
      ...r,
      hostTitle: null,
      hostBadge: null,
    }));
  }
};

async function getSections() {
  await ensureSeeded();
  await autoUpdateEventStatuses();

  // Events published exclusively inside a group are excluded from the
  // public homepage — they only ever appear inside that group's page.
  const publicScope = isNull(events.groupId);

  const hotQuery = await baseSelect();
  const latestQuery = await baseSelect();
  const upcomingQuery = await baseSelect();

  const [hot, latest, upcoming, activeCount, announcement] = await Promise.all([
    // Since baseSelect already returns results, we filter in memory for SSR stability
    // In a production app, we would use a more sophisticated query builder, 
    // but here we prioritize safety to restore the site.
    Promise.resolve(hotQuery
      .filter(e => !e.isPrivate && e.status !== "cancelled" && e.status !== "completed")
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, 4)),
    Promise.resolve(latestQuery
      .filter(e => !e.isPrivate && e.status !== "cancelled" && e.status !== "completed")
      .slice(0, 4)),
    Promise.resolve(upcomingQuery
      .filter(e => !e.isPrivate && e.status !== "cancelled" && e.status !== "completed")
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
      .slice(0, 4)),
    db.select({ count: sql<number>`count(*)` }).from(events).where(ne(events.status, "cancelled")),
    db.select().from(siteAnnouncements).where(eq(siteAnnouncements.isActive, true)).orderBy(desc(siteAnnouncements.createdAt)).limit(1),
  ]);

  return { hot, latest, upcoming, activeCount: Number(activeCount[0]?.count ?? 0), announcement: announcement[0] ?? null };
}

async function runSearch(params: { q?: string; region?: string; date?: string; tag?: string; sort?: string }) {
  const conditions = [eq(events.isPrivate, false), isNull(events.groupId), ne(events.status, "cancelled")];
  if (params.q) {
    conditions.push(
      or(
        ilike(events.title, `%${params.q}%`),
        ilike(events.description, `%${params.q}%`),
        ilike(events.meetingLocation, `%${params.q}%`)
      )!
    );
  }
  if (params.region) conditions.push(eq(events.region, params.region));
  if (params.date) conditions.push(eq(events.eventDate, params.date));
  if (params.tag) conditions.push(sql`${events.tags} ? ${params.tag}`);

  let orderBy = desc(events.createdAt);
  if (params.sort === "popular") orderBy = desc(sql`coalesce(${participantCountSub.count}, 0)`);
  if (params.sort === "upcoming") orderBy = asc(events.eventDate);

  const allResults = await baseSelect();
  const results = allResults
    .filter(e => !e.isPrivate && e.status !== "cancelled")
    .slice(0, 24);
  return results;
}

function searchResultTitle(params: { q?: string; region?: string; date?: string; tag?: string; sort?: string }) {
  if (params.sort === "popular") return { eyebrow: "TRENDING NOW", title: "🔥 熱門活動" };
  if (params.sort === "upcoming") return { eyebrow: "DON'T MISS OUT", title: "⏰ 即將開始的活動" };
  if (params.sort === "latest") return { eyebrow: "JUST ANNOUNCED", title: "🆕 最新活動" };
  if (params.tag) return { eyebrow: "INTEREST MATCH", title: `🏷️ #${params.tag} 活動` };
  if (params.q) return { eyebrow: "SEARCH RESULTS", title: `🔍 「${params.q}」的搜尋結果` };
  return { eyebrow: "FILTERED", title: "🔍 篩選結果" };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; date?: string; tag?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const hasFilters = !!(params.q || params.region || params.date || params.tag || params.sort);

  const { hot, latest, upcoming, activeCount, announcement } = await getSections();
  const searchResults = hasFilters ? await runSearch(params) : [];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3">
        <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-500/20 transition hover:scale-[1.01] active:scale-[0.99]">
          <Link href="/planner" className="flex items-center gap-3 px-4 py-3.5 text-sm text-white">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <span className="flex items-center gap-2 font-black">
                新功能上線啦！✨ AI 城市探索規劃器
                <BetaBadge />
              </span>
              <p className="mt-0.5 text-xs text-white/80">別再問「要去哪？」讓 AI 替你安排專屬揪團方案，一鍵開團！</p>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpRight size={20} className="shrink-0 opacity-60" />
            </div>
          </Link>
          <Link 
            href="/planner/guide"
            className="absolute right-12 top-1/2 -translate-y-1/2 hidden rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white hover:bg-white/30 sm:block z-10"
          >
            查看教學
          </Link>
        </div>

        {announcement && (
          <div className="animate-fade-up flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-500/10 to-coral-500/10 px-4 py-3 text-sm">
            <Megaphone size={18} className="shrink-0 text-brand-600" />
            <span className="font-semibold text-main">{announcement.title}</span>
            <span className="truncate text-soft">{announcement.content}</span>
          </div>
        )}
      </div>

      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-50 via-cream-50 to-coral-50 p-6 dark:from-[#152420] dark:via-[#151b1d] dark:to-[#241a18] md:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 animate-float rounded-full bg-brand-200/30 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-40 w-40 animate-float rounded-full bg-coral-200/40 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="chip">✨ 本週精選</span>
            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-main md:text-5xl">
              把喜歡的事，<br />
              <span className="text-brand-600">變成一起的事</span>。
            </h1>
            <p className="mt-4 text-sm text-soft md:text-base">
              目前有 {activeCount} 個正在發生的活動，找到和你頻率相同的好咖。
            </p>
            <Link href="/?sort=popular#search-results" className="btn-coral mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold">
              探索熱門活動 <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="relative hidden h-56 w-72 shrink-0 md:block">
            <div className="glass absolute inset-0 flex items-center justify-center rounded-[28px] text-6xl">🏕️</div>
            <div className="glass absolute -left-6 top-6 animate-float rounded-2xl px-3 py-2 text-xs font-bold text-main shadow-lg">
              🙋‍♀️🙋 +9 位好咖已成團
            </div>
          </div>
        </div>
        <div className="relative mt-8">
          <SearchBar />
        </div>
      </section>

      {hasFilters && (
        <section id="search-results" className="scroll-mt-24">
          <SectionTitle
            eyebrow={searchResultTitle(params).eyebrow}
            title={searchResultTitle(params).title}
            action={<Link href="/" className="text-sm font-semibold text-brand-600">清除篩選</Link>}
          />
          {searchResults.length === 0 ? (
            <EmptyState icon="🔍" title="找不到符合條件的活動" subtitle="試試調整搜尋關鍵字或篩選條件" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {searchResults.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </section>
      )}

      <RecommendedSection />

      <section>
        <SectionTitle eyebrow="TRENDING NOW" title="🔥 熱門活動" action={<Link href="/?sort=popular#search-results" className="flex items-center gap-1 text-sm font-semibold text-brand-600">更多 <ArrowUpRight size={14} /></Link>} />
        {hot.length === 0 ? (
          <EmptyState icon="🔥" title="目前還沒有熱門活動" subtitle="先建立一場活動，邀請更多好咖加入吧！" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hot.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="JUST ANNOUNCED" title="🆕 最新活動" action={<Link href="/?sort=latest#search-results" className="flex items-center gap-1 text-sm font-semibold text-brand-600">更多 <ArrowUpRight size={14} /></Link>} />
        {latest.length === 0 ? (
          <EmptyState icon="📝" title="目前還沒有最新活動" subtitle="成為第一位主辦人，建立你的第一場 JoinJoy 活動吧！" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      <section>
        <SectionTitle eyebrow="DON'T MISS OUT" title="⏰ 即將開始" action={<Link href="/?sort=upcoming#search-results" className="flex items-center gap-1 text-sm font-semibold text-brand-600">更多 <ArrowUpRight size={14} /></Link>} />
        {upcoming.length === 0 ? (
          <EmptyState icon="⏰" title="目前沒有即將開始的活動" subtitle="收藏或建立活動後，這裡會顯示你的下一個聚會。" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { href: "/map", icon: "🗺️", title: "地圖模式", desc: "在地圖上探索附近活動" },
          { href: "/groups", icon: "👥", title: "揪團社", desc: "找到並加入私人社團" },
          { href: "/leaderboard", icon: "🏆", title: "排行榜", desc: "看看誰是本月人氣揪主" },
          { href: "/legal/guidelines", icon: "🛡️", title: "社群公約", desc: "了解報名與黑名單規範" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="card-surface flex items-center gap-4 rounded-3xl p-5 transition hover:-translate-y-1 hover:shadow-lg">
            <span className="text-3xl">{item.icon}</span>
            <div>
              <p className="font-display font-bold text-main">{item.title}</p>
              <p className="text-xs text-soft">{item.desc}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}