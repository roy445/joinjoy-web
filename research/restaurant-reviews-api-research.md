
## 登入限制實作狀態（2026-08-18）
任務：Planner 加入登入限制，未登入顯示引導 UI。
專案關鍵資訊：
- `/api/auth/me` GET 回傳 `{ user }`，未登入 user 為 null（src/app/api/auth/me/route.ts）。
- App Shell 由 layout.tsx 以 `getCurrentUser()` 注入 user，未登入側欄顯示「尚未登入」與 /login 連結。
- /login 路徑存在（src/app/login/page.tsx）。
- 事件建立頁（src/app/events/create/page.tsx）用 `fetch("/api/auth/me")` 判斷未登入並顯示「請先登入才能建立活動」＋前往登入 btn-brand 連結。
- PlannerClient（src/components/planner-client.tsx）已完成：PlannerClient 內加 me/meLoading 狀態、auth/me effect、meLoading 時顯示「確認登入狀態…」spinner、未登入顯示品牌卡片引導（Users 圖示、AI 出遊規劃需要登入、前往登入/回到首頁按鈕），已登入才執行後續生成。
- 待辦：typecheck + lint（src/components/planner-client.tsx）、git diff --check、commit 推送到 feature/city-explorer-planner。
- 上一個 commit：6f66f5a（Foursquare 店家/逐時天氣/生成反饋）。分支 worktree 乾淨。
- Vercel 需設定：FOURSQUARE_API_KEY、GEOAPIFY_API_KEY。
