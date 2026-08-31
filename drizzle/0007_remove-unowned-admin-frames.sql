BEGIN;
UPDATE "users" AS u
SET "active_avatar_frame" = NULL,
    "updated_at" = now()
WHERE u."role" = 'admin'
  AND u."active_avatar_frame" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "user_inventory" AS ui
    INNER JOIN "shop_items" AS si ON si."id" = ui."item_id"
    WHERE ui."user_id" = u."id"
      AND si."type" = 'frame'
      AND si."name" = u."active_avatar_frame"
  );
COMMIT;