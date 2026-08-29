import Link from "next/link";
import { ArrowLeft, Sparkles, MapPin, Users, CloudSun, Zap, Info, ShieldAlert } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export default function PlannerGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <Link href="/planner" className="mb-6 flex items-center gap-2 text-sm font-bold text-soft hover:text-brand-500 transition-colors">
        <ArrowLeft size={16} /> 回到規劃器
      </Link>

      <header className="mb-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-xl shadow-brand-500/20">
          <Sparkles size={32} />
        </div>
        <h1 className="font-display text-3xl font-black text-main md:text-4xl">AI 城市探索規劃器</h1>
        <p className="mt-3 text-lg text-soft">使用手冊與注意事項 (BETA)</p>
      </header>

      <div className="space-y-12">
        {/* Step 1 */}
        <section className="card-surface rounded-[32px] p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white font-black">1</div>
            <div>
              <h2 className="text-xl font-black text-main">輸入你的需求</h2>
              <p className="mt-2 text-main leading-relaxed">
                告訴 AI 你的<b>出發地、預算、時間</b>以及<b>偏好的風格</b>。你也可以在「不能妥協」欄位輸入更具體的條件，例如「想去有貓的咖啡廳」或「不要爬山」。
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-app-soft p-4 border border-[var(--color-border)]">
                  <p className="text-xs font-bold text-brand-500 uppercase tracking-wider">💡 小撇步</p>
                  <p className="mt-1 text-sm text-soft italic">「預算設定得越準確，AI 推薦的餐廳等級就會越符合你的期待喔！」</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2 */}
        <section className="card-surface rounded-[32px] p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white font-black">2</div>
            <div>
              <h2 className="text-xl font-black text-main">AI 即時掃描與生成</h2>
              <p className="mt-2 text-main leading-relaxed">
                點擊生成後，系統會執行以下動作：
              </p>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center gap-3 text-sm text-main">
                  <CloudSun size={18} className="text-brand-500" /> <b>天氣掃描：</b> 自動抓取當日分時段天氣預報。
                </li>
                <li className="flex items-center gap-3 text-sm text-main">
                  <MapPin size={18} className="text-brand-500" /> <b>地點媒合：</b> 串接 Foursquare 資料庫尋找真實店家。
                </li>
                <li className="flex items-center gap-3 text-sm text-main">
                  <Zap size={18} className="text-brand-500" /> <b>路線計算：</b> 估算地點間的交通距離與時間。
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Step 3 */}
        <section className="card-surface rounded-[32px] p-6 md:p-8">
          <div className="flex items-start gap-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white font-black">3</div>
            <div>
              <h2 className="text-xl font-black text-main">挑選方案與一鍵開團</h2>
              <p className="mt-2 text-main leading-relaxed">
                AI 會為你提供 3 條不同風格的路線。點擊方案中的<b>店名</b>可以查看詳細資訊與導航。滿意的話，點擊「一鍵開團」即可直接建立 JoinJoy 活動，邀請朋友參加！
              </p>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="rounded-[32px] bg-coral-500/5 p-6 md:p-8 border border-coral-500/20">
          <div className="flex items-start gap-5">
            <ShieldAlert size={24} className="shrink-0 text-coral-500" />
            <div>
              <h2 className="text-xl font-black text-coral-600">重要注意事項</h2>
              <ul className="mt-4 space-y-3 text-sm text-coral-700 leading-relaxed">
                <li>• <b>BETA 階段：</b> 目前功能仍在測試中，AI 生成的地點偶爾可能出現資訊落差，請務必點擊導航連結確認該店家的最新營業狀態。</li>
                <li>• <b>預算估算：</b> 方案中的金額為預估值，不包含突發的交通費用或個人購物支出。</li>
                <li>• <b>天氣變化：</b> 天氣預報為即時數據，但氣候變化莫測，建議出門前再次確認即時雷達圖。</li>
                <li>• <b>地點連結：</b> 點擊店名旁的地圖圖示可直接開啟 Google Maps，方便你確認評價與訂位資訊。</li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <SectionTitle eyebrow="FAQ" title="常見問題" />
          <div className="mt-6 space-y-4">
            {[
              { q: "為什麼有時候搜不到地點？", a: "這可能是因為該區域的資料庫資訊較少，或是你設定的預算與距離限制太過嚴格。建議可以稍微放寬預算或擴大距離再試一次。" },
              { q: "生成行程需要收費嗎？", a: "目前 AI 規劃器對所有 JoinJoy 會員免費開放測試中！" },
              { q: "我可以修改 AI 生成的行程嗎？", a: "當然可以！「一鍵開團」後，你仍然可以自由編輯活動的詳細內容、時間與地點。" },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl border border-[var(--color-border)] p-5">
                <p className="font-bold text-main">Q: {item.q}</p>
                <p className="mt-2 text-sm text-soft leading-relaxed">A: {item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-16 border-t border-[var(--color-border)] pt-8 text-center">
        <p className="text-sm text-soft">還有其他問題？歡迎聯繫 JoinJoy 客服團隊</p>
        <Link href="/planner" className="btn-brand mt-6 inline-flex rounded-full px-8 py-3 font-black text-white shadow-lg shadow-brand-500/20">
          立即開始規劃
        </Link>
      </footer>
    </div>
  );
}
