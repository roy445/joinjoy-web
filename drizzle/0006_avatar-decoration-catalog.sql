BEGIN;
INSERT INTO "shop_items" ("name", "type", "price", "description", "rarity", "metadata", "is_active")
SELECT name, 'frame', price, description, rarity, metadata::jsonb, true FROM (VALUES
('🌿 清風漫遊',80,'小葉子與微小光點環繞頭像，偶爾有葉片飄過，整體輕柔自然。','common','{"theme":"breeze","particleCount":8,"animation":"leaf-drift","motifs":["leaf","glow"]}'),
('⭐ 星光環遊',150,'頭像周圍有幾顆星星緩慢旋轉，偶爾閃耀一下，外圈有淡淡星光。','rare','{"theme":"star","particleCount":10,"animation":"slow-orbit","motifs":["star","sparkle"]}'),
('🌊 深海泡泡',220,'藍色水波環繞，氣泡從下方緩慢上升，偶爾出現小型閃光。','rare','{"theme":"ocean","particleCount":12,"animation":"bubble-rise","motifs":["bubble","wave"]}'),
('🍬 糖果派對',300,'彩色糖果、愛心與小星星繞著頭像漂浮，偶爾彈跳與閃爍，活潑可愛。','epic','{"theme":"candy","particleCount":13,"animation":"candy-bounce","motifs":["candy","heart","star"]}'),
('🌌 銀河旅者',420,'紫藍色銀河圍繞頭像旋轉，大量星塵與小星星緩慢移動，偶爾有流星劃過。','epic','{"theme":"galaxy","particleCount":18,"animation":"meteor-orbit","motifs":["stardust","star","meteor"]}'),
('⚡ 雷霆疾行',550,'電光沿著相框邊緣快速流動，偶爾產生小型閃電與能量粒子，具有速度感。','epic','{"theme":"thunder","particleCount":12,"animation":"electric-edge","motifs":["bolt","energy"]}'),
('🔥 焰心旅人',680,'頭像外圍有流動火焰，火星向上飄散，外圈會週期性爆發橘紅色光芒。','legendary','{"theme":"flame","particleCount":15,"animation":"flame-rise","motifs":["flame","ember"]}'),
('👑 黃金榮耀',850,'金色皇冠元素、金色流光與閃耀粒子，光線沿著相框繞一圈。','legendary','{"theme":"gold","particleCount":16,"animation":"crown-sweep","motifs":["crown","shine"]}'),
('🪐 時空裂隙',1200,'頭像周圍有旋轉的時空環，紫藍粒子向內外流動，偶爾短暫出現空間裂隙效果。','legendary','{"theme":"rift","particleCount":20,"animation":"rift-pulse","motifs":["ring","rift","particle"]}'),
('🌠 JoinJoy 星域',2000,'頂級專屬相框，完整星系環繞頭像，多層軌道、流星、星塵與能量粒子持續運動。','legendary','{"theme":"joinjoy","particleCount":26,"animation":"galaxy-entry","motifs":["orbit","meteor","stardust","energy"],"entrySequence":["dust-gather","energy-form","frame-appear","halo-expand","particle-burst"]}')
) AS catalog(name, price, description, rarity, metadata)
WHERE NOT EXISTS (SELECT 1 FROM "shop_items" WHERE "shop_items"."name" = catalog.name AND "shop_items"."type" = 'frame');
COMMIT;