import { db } from "@/db";
import { sql, inArray } from "drizzle-orm";
import { events } from "@/db/schema";
import { processEventRewards } from "./gamification";

// Opportunistically promotes events from upcoming -> ongoing -> completed based
// on wall-clock time, since there is no background cron job in this environment.
// Calling this cheaply at the top of read-heavy endpoints (event lists, event
// detail, my-events) keeps statuses accurate without a dedicated scheduler,
// which in turn unlocks the post-event rating flow automatically.
export async function autoUpdateEventStatuses() {
  await db.execute(sql`
    UPDATE events
    SET status = 'ongoing'
    WHERE status = 'upcoming'
      AND (event_date || ' ' || start_time)::timestamp <= now()
      AND (event_date || ' ' || coalesce(end_time, start_time))::timestamp > now()
  `);

  // 找出即將變更為 completed 的活動 ID
  const completedEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(sql`status IN ('upcoming', 'ongoing') AND (event_date || ' ' || coalesce(end_time, start_time))::timestamp <= now()`);

  if (completedEvents.length > 0) {
    const ids = completedEvents.map(e => e.id);
    
    // 更新狀態
    await db.update(events)
      .set({ status: 'completed' })
      .where(inArray(events.id, ids));

    // 處理獎勵 (異步處理，不阻塞主流程)
    for (const id of ids) {
      processEventRewards(id).catch(err => console.error(`獎勵發放失敗 [Event ${id}]:`, err));
    }
  }
}