# JoinJoy 動態與榮譽商城改版決策紀錄

## Mode
Redesign · Preserve：保留現有 JoinJoy 綠色／珊瑚橘／奶油色語彙、路由、表單欄位、登入與商城交易流程，只做有邊界的動態與視覺延伸。

## Preserve
- 現有登入 API `/api/auth/login`、表單欄位 `email` 與 `password`、登入後導向與錯誤處理。
- 現有個人設定、J 幣、活動參加、商城購買與裝備流程。
- 現有品牌 Logo、J 幣素材、JueJue 素材與高對比原則。
- 既有管理員後端權限驗證、J 幣交易審計與商城庫存規則。

## Improve
- 登入頁：卡片與品牌裝飾採分層進場、欄位 focus 微動態、提交狀態與成功導向回饋。
- 行為回饋：登入成功、獲得 J 幣、活動參加成功、贈送成功、商城購買／裝備成功提供短時間、可跳過、尊重 reduced-motion 的回饋。
- 榮譽商城：以清楚的 Common／Rare／Epic／Legendary 等級層級呈現頭像框，使用真實商品資料與 CSS 特效，不影響購買或裝備 API。
- 操作可達性：動畫不遮擋按鈕、不鎖住頁面、不依賴 hover，手機與鍵盤均可完成主要操作。

## Remove
- 不新增深色霓虹主題、透明低對比面板、長時間阻塞式動畫或自動播放聲音。
- 不使用前端動畫直接發放 J 幣、物品或改變權限；所有獎勵仍由後端確認。

## Protected contracts
- 不改變公開路由、登入表單名稱／順序、商城與管理 API 的資料契約。
- 不將金鑰、敏感使用者資料或管理員權限放入前端動畫狀態。
- 不以 CSS 隱藏既有錯誤、權限或交易結果；動畫失敗時內容與操作仍可用。

## Design Read + dials
- artifact：JoinJoy 全站互動回饋與榮譽商城延伸
- audience：使用活動揪團、Planner、J 幣與社群榮譽系統的會員；管理員額外使用贈送功能
- visual-language：溫暖社群產品的品牌 motion，像紙卡與金幣被輕柔喚起；明亮奶油底、JoinJoy 綠主導、珊瑚橘做成功與行動強調
- mode：preserve / extension
- visual-variance：4/10
- motion-intensity：6/10，短促且有目的
- information-density：5/10
- asset-dependence：6/10，商城頭像框使用 CSS/SVG-safe effects 與既有素材
- brand-fidelity：10/10

## Positioning questions
- Narrative role：登入是歡迎入口；成功事件是即時確認；榮譽商城是可收藏、可比較、可裝備的獎勵展示。
- Viewing distance：手機近距離與桌機一公尺閱讀；文字維持現有密度，不以巨大標題換取戲劇性。
- Visual temperature：溫暖、活潑、有成就感，但不吵鬧；高稀有度只增加光暈與流光，不變成霓虹黑底。
- Capacity check：所有動畫均為局部 transform/opacity，商城卡片內容在靜止狀態完整可讀；任何動畫關閉時仍保留完整功能。

## Design system
- Colors：brand green `#0f766e`／`#148f80`；coral `#ef7b68`；cream `#fffaf0`；ink `#18332f`；muted `#5c6f69`；gold `#c58a16`。背景保持不透明，文字使用深色或白色高對比組合。
- Typography：沿用專案既有 display/body 字體與階層；動畫不放大標題超過現有比例。登入主標約 2xl，內文 sm，按鈕 sm/bold。
- Spacing：8px grid；卡片 padding、間距與商城網格沿用現有 token。
- Radius：延續 rounded-xl／rounded-[28px] 的柔和卡片語彙；頭像框以 18–24px 圓角配合頭像。
- Shadow：以柔和品牌色陰影表示 elevation；稀有度由邊框、光暈、流光與粒子層級區分。
- Motion：`ease-out` 160–260ms 小互動；進場 420–620ms；成功慶祝 900–1400ms 且不阻塞；支援 `prefers-reduced-motion` 降為淡入或靜態狀態。

## Highest-risk change
全站行為事件的觸發位置可能重複播放或與伺服器結果脫鉤。實作時只在已收到成功 API 回應後觸發 client feedback，並以事件元件短暫掛載、不改變資料狀態。

## Rollback / fallback
所有新增動畫使用獨立元件與 class；若瀏覽器不支援或使用者啟用 reduced motion，仍顯示靜態成功訊息。商城商品資料不存在時只顯示現有商品，不建立虛構交易。

## v0 scope
第一版先做登入進場／提交狀態、成功回饋元件與商城頭像框視覺卡片；確認品牌動態強度後，再擴展至 J 幣取得、活動參加與贈送成功狀態。
