import { SectionTitle } from "@/components/ui";
import { ShieldAlert, UserX, Star, Ban } from "lucide-react";

export default function GuidelinesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <SectionTitle eyebrow="COMMUNITY GUIDELINES" title="🛡️ 社群公約與黑名單制度" />

      <div className="card-surface flex items-start gap-3 rounded-2xl p-5">
        <ShieldAlert className="mt-1 shrink-0 text-coral-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-main">報名須知</h3>
          <p className="mt-1 text-sm text-soft">
            報名任何活動即代表您承諾將準時出席。若因個人因素無法出席，請務必提前透過聊天室或聯絡方式告知揪主取消報名，讓名額釋出給候補的夥伴。
            <b className="text-coral-600">「報名後無故未出席（放鳥）」或於活動中發生「詐騙、騷擾、人身安全疑慮」等違規事項，將承擔被列入黑名單或封鎖帳號的風險，請務必三思而後報名。</b>
          </p>
        </div>
      </div>

      <div className="card-surface flex items-start gap-3 rounded-2xl p-5">
        <UserX className="mt-1 shrink-0 text-rose-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-main">揪主黑名單申請機制</h3>
          <p className="mt-1 text-sm text-soft">
            活動主辦人（揪主）若遇到成員無故未出席、騷擾或其他違規行為，可以在活動結束後向平台管理員提出「黑名單申請」，詳述原因與事情經過（可附上證據截圖）。
            管理員將會查核相關紀錄，若查證屬實，該名使用者將被正式列入平台黑名單：
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-soft">
            <li>日後參加任何活動時，將被標記為「黑名單使用者」提醒揪主留意</li>
            <li>信用分數將被扣除，影響个人頁面顯示的信任等級</li>
            <li>情節嚴重者可能被平台永久停權封鎖</li>
          </ul>
        </div>
      </div>

      <div className="card-surface flex items-start gap-3 rounded-2xl p-5">
        <Star className="mt-1 shrink-0 text-amber-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-main">信用評價系統</h3>
          <p className="mt-1 text-sm text-soft">
            每場活動結束後，參與者與揪主可以互相評分，包含準時程度、友善程度、是否無故未出席（放鳥）及整體評價。
            系統會依據評分紀錄自動計算每位使用者的信用分數，並顯示於個人頁面，作為未來報名活動時的參考依據。
          </p>
        </div>
      </div>

      <div className="card-surface flex items-start gap-3 rounded-2xl p-5">
        <Ban className="mt-1 shrink-0 text-gray-500" size={24} />
        <div>
          <h3 className="font-display font-bold text-main">建立活動權限管理</h3>
          <p className="mt-1 text-sm text-soft">
            為了避免任何人隨意開團、維護活動品質，建立活動前必須先取得權限：輸入管理員產生的一次性代碼，或向管理員提出申請並獲得核准。
            每組一次性代碼僅能使用一次，驗證成功後立即失效。
          </p>
        </div>
      </div>
    </div>
  );
}
