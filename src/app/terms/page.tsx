import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/legal";

const sections = [
  ["1. 平台定位與服務範圍", "JoinJoy 提供活動建立、資訊展示、報名與社群溝通工具。平台不等同於每一場活動的實際主辦人，不代表平台認證所有使用者，也不保證活動或第三方行為安全。"],
  ["2. 使用者責任", "使用者須提供真實且不具誤導性的資料，妥善保管帳號，不得冒用他人、繞過權限、散布詐騙或違法內容。活動建立者須確保活動資訊、費用、地點與規則清楚正確。參加者應自行評估風險並遵守活動規範。"],
  ["3. 禁止行為與處理", "禁止騷擾、威脅、詐騙、性剝削、危險或違法活動、未經同意蒐集個資、惡意大量請求與操縱平台資料。平台得在適用法律允許範圍內暫停活動、限制功能、移除內容或停權，並保存必要的處理紀錄。"],
  ["4. 金錢與第三方風險", "除非頁面明確說明，JoinJoy 不提供金流託管或交易保證。請勿私下匯款給陌生人、提供密碼、驗證碼或銀行資料。使用者使用地圖、圖片、Email、AI 或其他第三方服務時，也須遵守其條款。"],
  ["5. 服務中斷與責任邊界", "平台會採取合理措施維持服務與處理檢舉，但網路、雲端、第三方服務或不可抗力可能造成中斷。在適用法律允許範圍內，平台不對使用者自行發布的內容、活動安排或第三方行為作不當保證；依法不得排除或限制的責任不受本條排除。"],
  ["6. 檢舉、申訴與條款更新", "使用者可透過檢舉功能回報活動、帳號、訊息或連結。平台會依案件資料進行合理處理。條款更新時會標示版本與生效日期；重大變更可能要求重新同意。"],
];

export default function TermsPage() {
  return <main className="mx-auto max-w-4xl px-4 py-10 md:px-8"><Link href="/" className="text-sm font-bold text-brand-600">← 返回首頁</Link><h1 className="mt-6 font-display text-3xl font-black text-main">使用條款</h1><p className="mt-2 text-sm text-soft">版本 {LEGAL_VERSIONS.terms} · 生效日 2026-09-22</p><div className="card-surface mt-8 space-y-7 rounded-3xl p-6 leading-7 text-main md:p-9">{sections.map(([title, body]) => <section key={title}><h2 className="font-display text-xl font-black">{title}</h2><p className="mt-2 text-sm text-soft">{body}</p></section>)}<p className="border-t border-[var(--color-border)] pt-5 text-xs text-soft">本頁內容是產品規範草案，正式上線前應依實際營運主體、所在地、付款模式與資料流程交由台灣適用法律的律師或法律專業人士審閱。</p></div></main>;
}
