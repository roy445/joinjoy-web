# JoinJoy Compute Optimization Record

**日期：** 2026-09-22  
**範圍：** 降低不必要 Neon PostgreSQL query 與高頻觸發。  
**明確限制：** 本次沒有刪除資料、沒有搬遷資料庫、沒有更換 `DATABASE_URL`、沒有建立第二資料庫、沒有執行 migration，也沒有宣稱 Neon Compute 已經下降。

## Before

### 1. 通知未讀數高頻輪詢

`src/components/notification-bell.tsx` 原本在每個登入分頁 mount 後立即查詢一次，接著每 10 秒呼叫 `/api/notifications?unreadCount=1`。每次 API 會對 `notifications` 執行一次未讀 count query。這是程式碼中最明確的固定高頻 DB 來源之一。

### 2. 系統公告高頻輪詢

`src/components/system-announcement-banner.tsx` 原本每 10 秒呼叫 `/api/support`。每次呼叫會同時查詢 `system_announcements` 與 `service_controls`，即每次兩個 DB query。由於 banner 位於共用 layout，長時間開啟網站的分頁會持續觸發。

### 3. 投票 N+1

`src/app/api/events/[id]/polls/route.ts` 原本先查 polls，再查一次最新 poll votes，之後對每個 poll 平行各查一次 votes。若有 N 個 polls，GET 至少會觸發 `2 + N` 次 votes/polls query，而且有一個不會被使用的額外 votes 查詢。

### 4. 提醒端點的寬範圍掃描

`src/app/api/cron/reminders/route.ts` 原本查詢所有 `reminderSentAt IS NULL` 且未取消／未完成的活動，再由 application code 判斷是否在 24 小時內。符合條件的活動會逐一查 approved participants。repository 內未找到它的呼叫端或 `vercel.json` Cron 設定，因此無法由程式碼證明它目前的實際觸發頻率。

### 5. 活動聊天室 4 秒輪詢

`ChatTab` 原本每 4 秒呼叫 `/api/events/[id]/chat?sinceId=...`。每次 GET 仍會先查活動、查成員資格，再查訊息，即使沒有新訊息也會產生多次 DB query。

## After

### 已修改

| 變更 | 實際修改 | 預期降低 Compute 的原因 | 功能影響 |
|---|---|---|---|
| 通知輪詢 10 秒 → 60 秒 | 只在頁面可見時每 60 秒查詢；回到頁面時立即補查 | 固定輪詢頻率降低為原本的 1/6；背景分頁不再持續查詢 | 未讀通知仍會在頁面重新顯示時更新；不是即時推播 |
| 公告輪詢 10 秒 → 60 秒 | 只在頁面可見時每 60 秒查詢；保留支援更新事件立即刷新 | `/api/support` 的兩個 query 觸發次數大幅降低；背景分頁不輪詢 | 管理員觸發的前端事件仍可即時刷新 |
| 投票 N+1 → 2 query | poll list 一次、所有 votes 以 `inArray(pollIds)` 一次批次讀取；只選必要欄位；最多 50 polls | poll 數增加時不再線性增加 DB round trips | 投票結果、總票數與目前使用者票選狀態保持不變；最多顯示 50 筆 polls |
| Reminder query 範圍縮小 | 只取 today/tomorrow、必要欄位、最多 500 筆；每來源 5 分鐘 rate limit；支援 `CRON_SECRET` | 不再掃描所有未提醒歷史／遠期活動；避免公開端點被短時間重複觸發 | 正常 24 小時內活動提醒保留；若外部 Cron 使用 secret，需加 `Authorization: Bearer <CRON_SECRET>` |
| 聊天室 4 秒 → 30 秒 | 僅可見分頁輪詢；背景分頁停止；重新顯示時以目前 message id 查增量訊息 | 固定聊天室權限查詢與訊息 query 觸發頻率降低為原本的 1/7.5，且背景分頁不再輪詢 | 仍保留聊天室更新；非即時推播，最長約 30 秒更新一次 |
| Query diagnostic monitor | 在共用 pg Pool 記錄 operation、次數、耗時、max、average；不保存 SQL 文字或 user data；管理員可讀 `/api/admin/db-stats` | 不直接降低 Compute，但能取得實際 process-local query shape，協助用 Neon Usage 找最大來源 | 只提供診斷資料；serverless instance 重啟後統計歸零；不是 Neon Usage 替代品 |

### 沒有修改的資料正確性區域

以下資料沒有加入長時間 cache，因為它們必須保持正確：J Coins、報名狀態、權限、帳號狀態、檢舉／安全狀態、管理員操作。首頁原本已有的 server-side cache 沒有擴大到這些敏感資料。

## Index / Migration 判斷

本次**不需要 migration**。原因是本次只改 query 形狀、client polling 與 process-local monitoring，沒有改資料表結構。既有 schema 已有 `events.eventDate`、`events.hostId`、`event_participants.eventId`、`event_participants.userId`、`notifications.userId` 等索引；是否需要複合索引不能只靠靜態程式碼判斷，應先在 Neon 使用實際 query plan／table size 驗證。

候選但未執行的索引：

| 候選 index | 原因 | 為何本次不直接執行 |
|---|---|---|
| `events(reminder_sent_at, event_date, status)` | Reminder 範圍查詢同時使用這些欄位 | 使用者明確要求先不要改重要 schema；且需要 Neon `EXPLAIN` 與資料分布確認是否值得 |
| `notifications(user_id, is_read, created_at)` | 未讀 count 與通知列表都使用 user/status/time | 需要實際 query plan 與資料量確認；本次先以降低輪詢次數處理 |
| `event_poll_votes(poll_id, user_id)` | 投票讀取與投票去重都會使用 poll/user | 應先確認既有 schema 或實際索引狀況，避免重複 index |

## 監控與驗證

新增 `/api/admin/db-stats`，僅管理員可讀，回傳目前 server instance 的 query operation 類型、query 次數、總耗時、平均耗時、最大耗時與最後執行時間。監控不保存 SQL 文字、參數、密碼或使用者私密資料。由於 Vercel serverless 可能有多個 instance，這些數字不能直接代表整體 Neon 使用量；必須和 Neon Console 的 Usage／Query History 交叉比對。

本次不宣稱 Compute 已經降低。正確表述是：**以上程式碼修改預期會降低不必要 query 觸發與 N+1 round trips；實際 Compute 變化仍需使用者在 Neon Console 比較修改前後 Usage。**
