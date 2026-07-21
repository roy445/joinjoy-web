"use client";

import { useRef, useState } from "react";
import { ShieldCheck, CalendarClock, Ban, MessageSquareWarning, CheckCircle2, X, Loader2 } from "lucide-react";

export function HostGuidelinesModal({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      setScrolledToEnd(true);
    }
  }

  async function handleAgree() {
    setLoading(true);
    try {
      await fetch("/api/host/agree-guidelines", { method: "POST" });
      onAgree();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass animate-pop flex w-full max-w-lg flex-col rounded-[28px] p-0 shadow-2xl" style={{ maxHeight: "88vh" }}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h3 className="font-display text-lg font-bold text-main">🎪 揪主守則（建立活動前必讀）</h3>
          <button onClick={onClose} className="rounded-full p-1 text-soft hover:text-coral-500"><X size={18} /></button>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5" style={{ minHeight: 0 }}>
          <p className="mb-4 text-xs font-semibold text-coral-600">請詳細閱讀以下內容至結尾，才能開始建立活動 👇</p>

          <div className="flex flex-col gap-4 text-sm">
            <GuidelineBlock icon={<ShieldCheck size={20} className="text-brand-600" />} title="揪主的責任">
              身為活動主辦人（揪主），你需要對活動內容的真實性負責，準時舉辦活動、妥善安排現場流程，並對參加者的體驗與人身安全給予基本的重視與照顧。嚴禁利用平台發布詐騙、廣告或不實資訊，違者將被停權或列入黑名單。
            </GuidelineBlock>

            <GuidelineBlock icon={<MessageSquareWarning size={20} className="text-coral-500" />} title="取消活動須說明原因">
              若因故需要取消活動，系統會要求你<b className="text-coral-600">填寫取消原因</b>，並會立即自動通知所有已報名的參加者。請盡量提前取消，避免造成參加者困擾，惡意或頻繁取消活動可能影響你的信用分數。
            </GuidelineBlock>

            <GuidelineBlock icon={<CalendarClock size={20} className="text-amber-500" />} title="活動開始前 24 小時將鎖定編輯">
              為了保障已報名參加者的權益，活動開始前 <b>24 小時</b>，系統會自動鎖定活動資訊的編輯功能（時間、地點、費用等重要資訊皆無法再修改）。請在活動開始前務必提前確認所有資訊正確無誤。如有緊急狀況，你仍然可以使用「取消活動」功能並說明原因。
            </GuidelineBlock>

            <GuidelineBlock icon={<Ban size={20} className="text-gray-500" />} title="違規處理">
              若違反上述規範，包含但不限於：發布不實活動、無故大量取消、對參加者造成人身安全疑慮等，平台管理員有權對你的帳號進行停權、撤銷建立活動權限，情節嚴重者將被列入黑名單。
            </GuidelineBlock>

            <p className="rounded-xl bg-app-soft p-3 text-xs text-soft">
              點擊「我已閱讀並同意」即表示你已理解並同意遵守以上揪主守則與平台相關規範。
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] px-6 py-4">
          <button
            disabled={!scrolledToEnd || loading}
            onClick={handleAgree}
            className="btn-brand flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {scrolledToEnd ? "我已閱讀並同意揪主守則" : "請往下滑閱讀至結尾"}
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