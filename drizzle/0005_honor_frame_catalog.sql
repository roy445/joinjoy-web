BEGIN;

-- JoinJoy 榮譽商城預設頭像框。以名稱作為穩定識別，避免重複插入或覆蓋管理員後續調整。
INSERT INTO "shop_items" ("name", "type", "price", "description", "rarity", "metadata", "is_active")
SELECT '晨露邊框', 'frame', 80, '清爽的品牌綠頭像框，適合剛加入 JoinJoy 的旅伴。', 'common', '{"border":"border-brand-400","effect":"none","level":"common"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "shop_items" WHERE "name" = '晨露邊框' AND "type" = 'frame');

INSERT INTO "shop_items" ("name", "type", "price", "description", "rarity", "metadata", "is_active")
SELECT '珊瑚星芒', 'frame', 180, '珊瑚橘光圈與柔和流光，讓你的個人頭像更有存在感。', 'rare', '{"border":"border-coral-400","effect":"shimmer","level":"rare"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "shop_items" WHERE "name" = '珊瑚星芒' AND "type" = 'frame');

INSERT INTO "shop_items" ("name", "type", "price", "description", "rarity", "metadata", "is_active")
SELECT '旅途星河', 'frame', 360, '帶有星屑閃爍效果的史詩頭像框，適合熱愛探索的旅伴。', 'epic', '{"border":"border-coral-500","effect":"sparkle","level":"epic"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "shop_items" WHERE "name" = '旅途星河' AND "type" = 'frame');

INSERT INTO "shop_items" ("name", "type", "price", "description", "rarity", "metadata", "is_active")
SELECT '金色傳說', 'frame', 720, '金色流光環繞的傳奇頭像框，代表你在 JoinJoy 的精彩旅程。', 'legendary', '{"border":"border-[#bf953f]","effect":"orbit-shine","level":"legendary"}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM "shop_items" WHERE "name" = '金色傳說' AND "type" = 'frame');

COMMIT;
