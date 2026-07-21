"use client";

import { useRef, useState } from "react";
import { Users, ShieldCheck, MessageSquareWarning, Ban, CheckCircle2, X, Loader2 } from "lucide-react";

export function GroupGuidelinesModal({ onAgree, onClose }: { onAgree: () => void; onClose: () => void }) {
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
      await fetch("/api/host/agree-group-guidelines", { method: "POST" });
      onAgree();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass animate-pop flex w-full max-w-lg flex-col rounded-[28px] p-0 shadow-2xl" style={{ maxHeight: "88vh" }}>
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <h3 className="font-display text-lg font-bold text-main">👥 社團規則（建立社團前必讀）</h3>
          <button onClick={onClose} className="rounded-full p-1 text-soft hover:text-coral-500"><X size={18} /></button>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-5" style={{ minHeight: 0 }}>
          <p className="mb-4 text-xs font-semibold text-coral-600">請詳細閱讀以下內容至結尾，才能開始建立社團 👇</p>

          <div className="flex flex-col gap-4 text-sm">
            <GuidelineBlock icon={<Users size={20} className="text-brand-600" />} title="社團建立者的責任">
              身為社團建立者，你需要妥善審核成員的加入申請，維護社團內的討論品質與活動安全。社團可設定為私人社團（需審核加入）或公開社團，發布在社團內的活動僅該社團的成員能看到與報名。
            </GuidelineBlock>

            <GuidelineBlock icon={<ShieldCheck size={20} className="text-amber-500" />} title="成員審核與管理">
              其他使用者可以在「揪團社」頁面搜尋並申請加入你的社團，你可以選擇核准或拒絕每一筆申請，也可以隨時將違規成員移出社團。請公平、公正地處理審核與管理事務。
            </GuidelineBlock>

            <GuidelineBlock icon={<MessageSquareWarning size={20} className="text-coral-500" />} title="社團專屬活動">
              建立活動時，你可以選擇將活動「僅發佈在社團內」，這類活動不會出現在首頁或公開搜尋，僅該社團的成員能夠看到並報名，適合經營穩定社群、揪熟悉的朋友出遊。
            </GuidelineBlock>

            <GuidelineBlock icon={<Ban size={20} className="text-gray-500" />} title="違規處理">
              若社團內出現詐騙、騷擾、廣告等違規內容，平台管理員有權對社團或相關成員進行停權、下架社團等處置，情節嚴重者建立者本人也將被列入黑名單。
            </GuidelineBlock>

            <p className="rounded-xl bg-app-soft p-3 text-xs text-soft">
              點擊「我已閱讀並同意」即表示你已理解並同意遵守以上社團規則與平台相關規範。
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
            {scrolledToEnd ? "我已閱讀並同意社團規則" : "請往下滑閱讀至結尾"}
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