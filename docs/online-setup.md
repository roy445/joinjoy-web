# JoinJoy 線上設定

## Vercel 環境變數

請到 Vercel 專案的 **Settings → Environment Variables** 設定以下變數。請套用到 Production；如需 Preview 測試，也要另外勾選 Preview。

| 名稱 | 值 | 用途 |
|---|---|---|
| `DATABASE_URL` | **資料庫供應商的 pooled/serverless PostgreSQL URL** | 登入、商城、支援中心與 migration |
| `DB_POOL_MAX` | `1`（建議） | 每個 Vercel instance 的最大資料庫連線數 |
| `DB_CONNECTION_TIMEOUT_MS` | `10000`（建議） | 資料庫連線等待上限；跨區部署可提高至 `15000` |
| `DB_IDLE_TIMEOUT_MS` | `10000`（建議） | 閒置連線回收時間 |
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP 主機 |
| `SMTP_PORT` | `465` | Gmail SSL SMTP 連接埠 |
| `SMTP_USER` | 管理員 Gmail 帳號 | 發信帳號 |
| `SMTP_PASS` | Gmail App Password | 發信密碼；不要填一般 Gmail 登入密碼 |
| `ERROR_REPORT_TO` | `r03259468@gmail.com` | 錯誤回報與嚴重服務通知收件人 |

設定 `SMTP_PASS` 前，請在 Gmail 帳號開啟兩步驟驗證並建立 **App Password**。 App Password 只應放在 Vercel Environment Variables，不要提交到 Git、聊天或前端程式碼。

### `Connection terminated due to connection timeout` 排查

這個錯誤通常不是登入 SQL 或使用者信箱格式錯誤，而是 Vercel 到 PostgreSQL 端點在逾時前沒有建立連線。請依序確認：

1. `DATABASE_URL` 已設定在 Vercel **Production**；若 Preview 也要測試，需另外勾選 Preview。
2. 優先使用資料庫平台提供的 **pooled / serverless connection string**，不要把只適合長連線的 direct URL 當成 Vercel Runtime URL。
3. URL 使用 SSL；依資料庫平台格式通常需要包含 `sslmode=require`。不要自行把密碼或完整 URL 貼到前端、Git 或聊天訊息。
4. Vercel 與資料庫的區域距離較遠時，保留 `DB_CONNECTION_TIMEOUT_MS=10000`；仍逾時可暫時調成 `15000`。
5. 更新環境變數後必須重新部署；既有 deployment 不會自動讀取新值。

程式目前已將連線逾時由 1 秒提高至 10 秒、使用暖機 instance 重用小型 pool，並將 pool 上限預設為 1，避免以增加連線數掩蓋資料庫供應商或區域設定問題。

## 線上資料庫 migration

使用最新分支的 migration 工具執行一次：

```bash
pnpm drizzle-kit migrate
```

若使用資料庫平台的 SQL Editor，請只執行最新版且已修正的 `drizzle/0008_support-center.sql`，不要執行舊版包含 `ai_providers` 的 SQL，也不要刪除既有表格。

## 驗證清單

設定完成後重新部署，再確認以下項目：

1. 已登入使用者可以開啟 `/support/report` 並送出錯誤回報。
2. 未登入使用者只會看到登入提示，無法送出表單。
3. `error_reports.user_id` 寫入目前登入使用者 ID，不再送出空值。
4. 管理員可以在 `/admin/support` 看到回報歷史與分析使用紀錄。
5. 送出回報後，若 SMTP 設定正確，管理員會收到 Gmail；若 SMTP 尚未設定，回報仍會保存在資料庫並顯示通知尚未完成。
