"use client";

import { useRef, useState } from "react";
import { ShieldAlert, UserX, Star, Ban, CheckCircle2, X } from "lucide-react";

export function GuidelinesModal({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledToEnd(true);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass animate-pop flex w-full max-w-lg flex-col rounded-[28px] p-0 shadow-2xl" style={{ maxHeight: "88vh" }}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h3 className="font-display text-lg font-bold text-main">🛡️ 社群公約與黑名單制度</h3>
          <button onClick={onClose} className="rounded-full p-1 text-soft hover:text-coral-500"><X size={18} /></button>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5" style={{ minHeight: 0 }}>
          <p className="mb-4 text-xs font-semibold text-coral-600">請詳細閱讀以下內容至結尾，才能繼續完成註冊 👇</p>

          <div className="flex flex-col gap-4 text-sm">
            <GuidelineBlock icon={<ShieldAlert size={20} className="text-coral-500" />} title="報名須知">
              報名任何活動即代表您承諾將準時出席。若因個人因素無法出席，請務必提前透過聊天室或聯絡方式告知揪主取消報名，讓名額釋出給候補的夥伴。
              <b className="text-coral-600">「報名後無故未出席（放鳥）」或於活動中發生「詐騙、騷擾、人身安全疑慮」等違規事項，將承擔被列入黑名單或封鎖帳號的風險，請務必三思而後報名。</b>
            </GuidelineBlock>

            <GuidelineBlock icon={<UserX size={20} className="text-rose-500" />} title="揪主黑名單申請機制">
              活動主辦人（揪主）若遇到成員無故未出席、騷擾或其他違規行為，可以在活動結束後向平台管理員提出「黑名單申請」，詳述原因與事情經過。
              管理員將會查核相關紀錄，若查證屬實，該名使用者將被正式列入平台黑名單，日後參加任何活動都將被標記提醒，信用分數也會被扣除，情節嚴重者可能被永久停權封鎖。
            </GuidelineBlock>

            <GuidelineBlock icon={<Star size={20} className="text-amber-500" />} title="信用評價系統">
              每場活動結束後，參與者與揪主可以互相評分，包含準時程度、友善程度、是否無故未出席（放鳥）及整體評價，系統會依評分紀錄計算信用分數並顯示於個人頁面。
            </GuidelineBlock>

            <GuidelineBlock icon={<Ban size={20} className="text-gray-500" />} title="建立活動權限管理">
              為了避免任何人隨意開團、維護活動品質，建立活動前必須先取得權限：輸入管理員產生的一次性代碼，或向管理員提出申請並獲得核准。
            </GuidelineBlock>

            <p className="rounded-xl bg-app-soft p-3 text-xs text-soft">
              註冊即表示您已閱讀、理解並同意遵守以上社群公約與相關規範。若違反規定，平台有權對您的帳號採取停權、黑名單或其他必要措施。
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] px-6 py-4">
          <button
            disabled={!scrolledToEnd}
            onClick={onAgree}
            className="btn-brand flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCircle2 size={16} /> {scrolledToEnd ? "我已閱讀並同意社群公約" : "請往下滑閱讀至結尾"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuidelineBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-app-soft p-4">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="font-display font-bold text-main">{title}</p>
        <p className="mt-1 text-soft">{children}</p>
      </div>
    </div>
  );
}
