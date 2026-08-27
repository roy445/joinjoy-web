import { db } from "@/db";
import { users, eventParticipants, events } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

/**
 * 當活動完成時，發放獎勵並更新成就統計
 */
export async function processEventRewards(eventId: number) {
  // Use a transaction to ensure atomicity and avoid race conditions
  await db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(and(eq(events.id, eventId), eq(events.status, "completed")))
      .limit(1);
    
    // Check if rewards were already processed (using a hypothetical column or metadata)
    // For now, we rely on the caller to ensure this is only called once per completion
    // A better way is to add a `rewardsProcessedAt` column to the events table
    if (!event) return;

    // 1. 找出所有參加且被標記為「已出席」的成員
    // In a real scenario, we should only reward those where attended = true
    const participants = await tx
      .select({ userId: eventParticipants.userId })
      .from(eventParticipants)
      .where(and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.status, "approved")));

    // 2. 為主辦人發放獎勵 (揪主獎勵更高)
    await awardJCoinsInternal(tx, event.hostId, 50, "主辦活動獎勵");
    await updateUserStatsInternal(tx, event.hostId, event.tags || []);

    // 3. 為參加者發放獎勵
    for (const p of participants) {
      if (p.userId === event.hostId) continue;
      await awardJCoinsInternal(tx, p.userId, 10, "參加活動獎勵");
      await updateUserStatsInternal(tx, p.userId, event.tags || []);
    }
  });
}

async function awardJCoinsInternal(tx: any, userId: number, amount: number, reason: string) {
  await tx
    .update(users)
    .set({
      jCoins: sql`${users.jCoins} + ${amount}`,
    })
    .where(eq(users.id, userId));
}

async function updateUserStatsInternal(tx: any, userId: number, tags: string[]) {
  const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const stats = (user.activityStats as Record<string, number>) || {};
  
  // Normalization taxonomy
  const categoryMap: Record<string, string> = {
    "美食": "美食", "餐廳": "美食", "吃喝": "美食", "甜點": "美食", "咖啡": "美食",
    "登山": "戶外", "爬山": "戶外", "露營": "戶外", "健行": "戶外",
    "運動": "運動", "健身": "運動", "羽球": "運動", "籃球": "運動", "跑步": "運動",
    "電影": "娛樂", "影集": "娛樂", "看戲": "娛樂",
    "桌遊": "智力", "密室": "智力", "解謎": "智力", "劇本殺": "智力",
  };

  for (const tag of tags) {
    const category = categoryMap[tag] || tag;
    stats[category] = (stats[category] || 0) + 1;
  }

  const newTitles: string[] = [...(user.aiTitles || [])];
  const titleCheck = [
    { cat: "戶外", count: 3, title: "荒野獵人" },
    { cat: "美食", count: 3, title: "五星食評" },
    { cat: "運動", count: 3, title: "熱血運動員" },
    { cat: "娛樂", catAlt: "電影", count: 3, title: "電影達人" },
    { cat: "智力", catAlt: "桌遊", count: 3, title: "策略大師" },
  ];

  for (const check of titleCheck) {
    const count = (stats[check.cat] || 0) + (check.catAlt ? (stats[check.catAlt] || 0) : 0);
    if (count >= check.count && !newTitles.includes(check.title)) {
      newTitles.push(check.title);
    }
  }

  await tx
    .update(users)
    .set({
      activityStats: stats,
      aiTitles: newTitles,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * 發放 J-幣
 */
export async function awardJCoins(userId: number, amount: number, reason: string) {
  await db
    .update(users)
    .set({
      jCoins: sql`${users.jCoins} + ${amount}`,
    })
    .where(eq(users.id, userId));
  
  // TODO: 可在此加入通知或交易紀錄
}

/**
 * 更新使用者統計並偵測新稱號
 */
export async function updateUserStats(userId: number, tags: string[]) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const stats = (user.activityStats as Record<string, number>) || {};
  
  // 更新標籤統計
  for (const tag of tags) {
    stats[tag] = (stats[tag] || 0) + 1;
  }

  // 偵測新稱號邏輯
  const newTitles: string[] = [...(user.aiTitles || [])];
  
  const titleCheck = [
    { tag: "登山", count: 3, title: "荒野獵人" },
    { tag: "美食", count: 3, title: "五星食評" },
    { tag: "運動", count: 3, title: "熱血運動員" },
    { tag: "電影", count: 3, title: "電影達人" },
    { tag: "桌遊", count: 3, title: "策略大師" },
  ];

  let added = false;
  for (const check of titleCheck) {
    if (stats[check.tag] >= check.count && !newTitles.includes(check.title)) {
      newTitles.push(check.title);
      added = true;
    }
  }

  await db
    .update(users)
    .set({
      activityStats: stats,
      aiTitles: newTitles,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
