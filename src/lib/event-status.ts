import { db } from "@/db";
import { sql } from "drizzle-orm";

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

  await db.execute(sql`
    UPDATE events
    SET status = 'completed'
    WHERE status IN ('upcoming', 'ongoing')
      AND (event_date || ' ' || coalesce(end_time, start_time))::timestamp <= now()
  `);
}