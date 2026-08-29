-- JoinJoy default identity groups
-- Prerequisite: apply 0002_admin_identity_jcoins.sql first.
-- Safe to run repeatedly: existing groups with the same name are preserved.

BEGIN;

INSERT INTO "user_groups" (
  "name", "icon", "color", "effect", "description",
  "daily_ai_limit", "j_coin_bonus", "max_bonus_cap", "is_active"
)
VALUES
  (
    '新朋友', '🌱', '#247A57', 'soft-glow',
    'JoinJoy 的基本社群身份，累積參與經驗即可解鎖更多稱號。',
    50, 0, 30, true
  ),
  (
    '熱心揪主', '⭐', '#E8794F', 'sparkle',
    '鼓勵願意發起活動、照顧團隊與分享行程的社群夥伴。',
    75, 10, 30, true
  ),
  (
    '城市探索家', '🧭', '#C58A19', 'gold-shimmer',
    '喜歡探索新地點、參加不同主題活動的活躍成員。',
    100, 15, 30, true
  )
ON CONFLICT ("name") DO NOTHING;

COMMIT;
