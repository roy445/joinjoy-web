# JoinJoy 線上設定

## Vercel 環境變數

請到 Vercel 專案的 **Settings → Environment Variables** 設定以下變數。請套用到 Production；如需 Preview 測試，也要另外勾選 Preview。

| 名稱 | 值 | 用途 |
|---|---|---|
| `DATABASE_URL` | 正式 PostgreSQL 連線字串 | 登入、商城、支援中心與 migration |
| `SMTP_HOST` | `smtp.gmail.com` | Gmail SMTP 主機 |
| `SMTP_PORT` | `465` | Gmail SSL SMTP 連接埠 |
| `SMTP_USER` | 管理員 Gmail 帳號 | 發信帳號 |
| `SMTP_PASS` | Gmail App Password | 發信密碼；不要填一般 Gmail 登入密碼 |
| `ERROR_REPORT_TO` | `r03259468@gmail.com` | 錯誤回報與嚴重服務通知收件人 |

設定 `SMTP_PASS` 前，請在 Gmail 帳號開啟兩步驟驗證並建立 **App Password**。App Password 只應放在 Vercel Environment Variables，不要提交到 Git、聊天或前端程式碼。

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
