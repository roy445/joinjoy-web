# JoinJoy DATABASE Query Audit

**審計日期：** 2026-09-22  
**範圍：** `src/app/api`、Server Components、Client Components、Drizzle schema、輪詢與排程端點。  
**限制：** 本審計只使用 repository 靜態程式碼與可見設定；目前沒有可讀取的 Neon Usage、query log 或 `DATABASE_URL`，因此不捏造 Compute 百分比，也不把靜態 query 次數當成實際流量。

## 結論摘要

本次掃描沒有發現 React effect 造成的明確 query loop，但找到三個可直接確認的高頻輪詢來源，以及一個明確的 N+1 query：

1. `NotificationBell` 原本每 10 秒呼叫 `/api/notifications?unreadCount=1`。在登入使用者長時間開頁時，這是每個瀏覽器分頁每分鐘約 6 次 DB count query 的上限級來源；已改為僅可見分頁每 60 秒一次，並在重新顯示時補查。
2. `SystemAnnouncementBanner` 原本每 10 秒呼叫 `/api/support`，每次會查 `system_announcements` 與 `service_controls` 兩張表；已改為僅可見分頁每 60 秒一次，並保留事件觸發的即時刷新。
3. `/api/events/[id]/polls` 原本先查一次 votes，然後每個 poll 再查一次 votes，形成 `2 + poll 數量` 次查詢；已改為活動 polls 一次、所有 poll votes 一次批次查詢，並限制最多回傳 50 個 polls。
4. 活動聊天室原本每 4 秒呼叫一次增量訊息 API；每次請求仍會先做活動與成員權限查詢，再查訊息。已改為僅可見分頁每 30 秒查一次，背景分頁停止，重新顯示時用目前 message id 增量查詢。

此外，提醒端點原本會掃描所有尚未提醒且未取消／未完成的活動，再逐一查 participants；已改為只查今天至明天、只取必要欄位、最多 500 筆，並加上 5 分鐘 rate limit。此端點目前 repository 內沒有被首頁或其他元件呼叫，未設定 Vercel Cron。

## 功能別審計表

| 功能 | API / 程式位置 | 靜態 DB Query 次數 | 是否頻繁 | 是否可優化 | 審計結果 |
|---|---|---:|---|---|---|
| 首頁 | `src/app/page.tsx`、`/api/events`、`recommended-section` | 首頁主查詢已合併為 1 次快取查詢；推薦另 1 次，登入推薦再加 profile/history/favorites | 中 | 是 | 既有首頁已使用 30 秒 server cache；仍須以 Neon Usage 驗證實際效果 |
| 揪團列表 | `/api/events` | 1 次主要列表 query；包含 approved participant count subquery；上限由 `limit` 與 pagination 控制 | 中 | 部分 | 已有 LIMIT / OFFSET；計數 subquery 會提高單次成本，應依 Neon EXPLAIN 再決定是否調整 |
| 活動詳細頁 | `/api/events/[id]`、client `useEventData` | 1 次主要 detail query，依 route 內容另有 participants/comments 等相關請求 | 中 | 部分 | 未發現 effect loop；報名成功使用區域 reload callback，不是整頁 `location.reload` |
| 活動報名 | `/api/events/[id]/join` | GET/POST 依流程約 4–6 次，包含 event、profile、existing participant、count、寫入與通知 | 低至中 | 謹慎 | 報名狀態不可長時間 cache；不為省 Compute 合併成可能破壞正確性的 query |
| 投票 | `/api/events/[id]/polls` | 原本 `2 + N polls`；已改為 2 次（poll list + batched votes） | 活動頁使用時 | 是 | P1 N+1 已修正；votes 只取必要欄位 |
| 聊天室 | `/api/events/[id]/chat` + `ChatTab` | 每次增量讀取 1 次訊息 query，另有活動／成員權限查詢；原本每 4 秒 | 高 | 是 | 已改為可見分頁每 30 秒增量讀取，背景分頁停止 |
| 留言 | `/api/events/[id]/comments` | 單次列表 query，需檢查 route 內 LIMIT 與 client 觸發 | 中 | 部分 | 未在本次修改盲目改動，避免改變既有留言顯示行為 |
| 通知未讀數 | `/api/notifications?unreadCount=1` + `NotificationBell` | 每次 1 次 count query；原本每 10 秒 | 高 | 是 | 已改為可見分頁每 60 秒；登入、權限與安全狀態不 cache |
| 系統公告 | `/api/support` + `SystemAnnouncementBanner` | 每次 2 次 query；原本每 10 秒 | 高 | 是 | 已改為可見分頁每 60 秒；保留 `joinjoy:support-updated` 事件刷新 |
| 榮譽通知 | `/api/notifications/honor` + listener | 每次 1 次；目前每 120 秒且頁面隱藏時跳過 | 低 | 否 | 現況已屬合理低頻，不再降低以免延誤通知 |
| 我的活動 | `/api/my-events` | hosting、joined、fullUser、requests，約 4 次；兩個列表均無明確 pagination | 中 | 是 | 屬於後續 P1；應先確認使用者資料量與畫面需求，再加入 pagination |
| 收藏 | `/api/favorites` | 1 次帶 participant count subquery 的列表 query | 中 | 是 | 未設定明確 LIMIT；是後續 P1 候選，但不在本次盲改 |
| 推薦 | `/api/recommendations` | 未登入 1 次；登入約 4 次（upcoming、profile、history、favorites） | 中 | 是 | 每次首頁掛載會觸發；可在後續對非敏感公開候選加短 TTL，但使用者 profile/history 不應公開 cache |
| 管理員統計 | `/api/admin/stats` | 約 9 次 count/group query，含 distinct active sessions | 低至中 | 謹慎 | 查詢數多但每次為小型 aggregate；不直接合併成昂貴的大 SQL，需先用 Neon EXPLAIN |
| 管理員會員列表 | `/api/admin/members` | 列表 query；靜態檢查顯示缺乏明確 page limit | 低至中 | 是 | 高資料量時可能增加 Compute 與 response；後續應加入 server-side pagination |
| 管理員公告 | `/api/admin/announcements` | 列表 + 發送公告時查所有 users | 低 | 是 | 發送公告的 all-users query 是必要的通知 fan-out，但應以批次／背景程序處理，未在本次改動 |
| 管理員聊天室 | `/api/admin/chats` | 指定活動最多 100；未指定活動為 group aggregate | 低 | 部分 | 未指定活動的 rooms query 需依活動數量觀察 EXPLAIN |
| 提醒工作 | `/api/cron/reminders` | 原本掃描所有活動，符合時間後每活動 1 次 participants query + 1 次 update | 依觸發頻率而定 | 是 | 已縮小到 today/tomorrow、必要欄位、500 筆，並加 5 分鐘 rate limit |
| Planner 外部查詢 | `/api/planner/*` | 主要為外部 API fetch；未見直接 DB query | 可能頻繁 | 部分 | 不屬 Neon Compute 主要來源；外部 fetch 已有部分 `revalidate` |
| JueJue / AI | `/api/juejue/chat`、`/api/planner/chat` | route 本身未直接 DB query；`JueJue` 內部需另行觀察 | 依使用量 | 待監控 | 不宣稱無 DB 成本，需用 query monitor 與 Neon logs 交叉確認 |

## Polling / refresh 審查

掃描 `setInterval`、`setTimeout`、`useEffect`、`router.refresh`、`window.location.reload`、`revalidate` 與 polling 關鍵字後：

- 已確認並修正：通知未讀數 10 秒輪詢、系統公告 10 秒輪詢。
- 已確認並修正：活動聊天室 4 秒輪詢改為可見分頁 30 秒增量輪詢。
- 已確認目前合理：榮譽通知每 120 秒，且背景分頁略過。
- 未發現 `setInterval` 造成整頁 reload 的情況。
- `useEffect` 多數是 mount-only fetch；未發現明確的「state 更新導致 dependency 變動後無限重新 query」迴圈。
- `window.location.reload()` 未被當作報名成功後的必要更新策略使用；活動詳細頁使用局部資料 reload callback。

## N+1 / SELECT / Pagination 審查

- 明確 N+1：投票 votes，已改為 `inArray(pollIds)` 批次讀取。
- `SELECT *` 仍存在於多個管理／個人功能。這些資料可能是表單編輯或管理操作需要，不能只依字面搜尋就全部縮欄位；本次沒有破壞性地改動。
- 已存在的活動列表、投票、聊天室與管理 log 有 LIMIT；`my-events`、favorites、部分管理列表仍需要後續 pagination。
- 本次沒有新增 index，也沒有執行 migration，因為使用者要求先不修改重要資料表結構。

## 尚不能由 repository 證明的事項

- 無法只靠程式碼得出各路由實際 Neon Compute 百分比。
- 無法判斷 Vercel serverless instance 數量、冷啟動、連線建立次數與 Neon autosuspend 喚醒頻率。
- 無法確認提醒端點是否被外部 Cron、手動監控或第三方服務呼叫，因為 repository 沒有 Cron 設定且沒有呼叫端。
- 要得到真實 Top 10，需在 Neon Console／Query History／Vercel request log 對照本報告與新增的 `/api/admin/db-stats` process-local 診斷資料。
