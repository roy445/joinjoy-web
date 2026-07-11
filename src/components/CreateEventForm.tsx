"use client";

import { ArrowUpRight, CalendarDays, Check, ChevronDown, Image as ImageIcon, Link2, MapPin, ShieldCheck, Tag, Users, X } from "lucide-react";
import { useState, type FormEvent } from "react";

type Props = {
  open: boolean;
  accessCode: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

const categories = ["戶外探索", "美食同好", "運動健身", "藝文手作", "桌遊娛樂", "其他"];

export default function CreateEventForm({ open, accessCode, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [coverUrl, setCoverUrl] = useState("https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [location, setLocation] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [price, setPrice] = useState("0");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [allowWaitlist, setAllowWaitlist] = useState(true);
  const [ageLimit, setAgeLimit] = useState(false);
  const [allowCompanion, setAllowCompanion] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [genderLimit, setGenderLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title, coverUrl, category, description,
          startAt: `${date}T${startTime}:00`,
          endAt: `${date}T${endTime}:00`,
          location, mapUrl, capacity: Number(capacity), price: Number(price), contact, notes,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          requiresApproval, allowWaitlist, ageLimit, allowCompanion, visibility, genderLimit, accessCode,
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(data.message ?? "建立活動失敗");
        return;
      }
      onSuccess("活動建立成功！已經可以邀請好咖加入");
    } catch {
      setError("無法連線到伺服器，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return <div className="modal-backdrop" onClick={onClose}><div className="create-event-form-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close plain-close" onClick={onClose} aria-label="關閉"><X size={18} /></button><div className="create-form-heading"><span className="eyebrow">NEW GATHERING</span><h2>建立你的活動</h2><p>把喜歡的事，邀請剛剛好的好咖一起完成。</p></div><form onSubmit={submit}><div className="form-section-title"><span>01</span><div><strong>活動基本資料</strong><small>先讓大家知道這是一場什麼樣的聚會</small></div></div><div className="form-grid"><label className="form-field full"><span>活動名稱 *</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：週末森林慢旅・一日療癒小旅行" minLength={4} maxLength={160} required /></label><label className="form-field full"><span>封面圖片網址 *</span><div className="form-input-icon"><ImageIcon size={15} /><input value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://..." type="url" required /></div></label><label className="form-field"><span>活動分類 *</span><div className="select-wrap"><Tag size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></div></label><label className="form-field"><span>活動標籤</span><div className="form-input-icon"><Tag size={15} /><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="新手友善, 輕旅行" /></div></label><label className="form-field full"><span>活動介紹 *</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="分享活動亮點、適合誰參加，以及你期待遇見怎樣的好咖..." minLength={20} maxLength={5000} required /></label></div><div className="form-section-title"><span>02</span><div><strong>時間與地點</strong><small>清楚的資訊，讓每個人都能安心赴約</small></div></div><div className="form-grid"><label className="form-field"><span>活動日期 *</span><div className="form-input-icon"><CalendarDays size={15} /><input value={date} onChange={(event) => setDate(event.target.value)} type="date" required /></div></label><label className="form-field"><span>集合地點 *</span><div className="form-input-icon"><MapPin size={15} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="例如：捷運三峽站" required /></div></label><label className="form-field"><span>開始時間 *</span><input value={startTime} onChange={(event) => setStartTime(event.target.value)} type="time" required /></label><label className="form-field"><span>結束時間 *</span><input value={endTime} onChange={(event) => setEndTime(event.target.value)} type="time" required /></label><label className="form-field full"><span>Google 地圖連結</span><div className="form-input-icon"><Link2 size={15} /><input value={mapUrl} onChange={(event) => setMapUrl(event.target.value)} placeholder="貼上 Google Maps 位置連結" type="url" /></div></label></div><div className="form-section-title"><span>03</span><div><strong>名額與聯絡</strong><small>設定參加方式與活動費用</small></div></div><div className="form-grid"><label className="form-field"><span>名額上限 *</span><div className="form-input-icon"><Users size={15} /><input value={capacity} onChange={(event) => setCapacity(event.target.value)} type="number" min="2" max="1000" required /></div></label><label className="form-field"><span>每人費用（NT$）</span><input value={price} onChange={(event) => setPrice(event.target.value)} type="number" min="0" max="100000" /></label><label className="form-field"><span>聯絡方式 *</span><input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email、LINE 或 IG" required /></label><label className="form-field"><span>活動公開設定</span><div className="select-wrap"><ShieldCheck size={15} /><select value={visibility} onChange={(event) => setVisibility(event.target.value as "public" | "private")}><option value="public">公開活動</option><option value="private">私人活動</option></select><ChevronDown size={14} /></div></label><label className="form-field full"><span>注意事項</span><textarea className="short-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="例如：請穿著好走的鞋子、雨天備案..." /></label></div><div className="form-section-title"><span>04</span><div><strong>活動規則</strong><small>為參加者建立安全、舒服的聚會環境</small></div></div><div className="rule-grid"><label className="rule-toggle"><input type="checkbox" checked={requiresApproval} onChange={(event) => setRequiresApproval(event.target.checked)} /><span className="toggle-visual" /><div><strong>報名需要審核</strong><small>由你確認後才算報名成功</small></div></label><label className="rule-toggle"><input type="checkbox" checked={allowWaitlist} onChange={(event) => setAllowWaitlist(event.target.checked)} /><span className="toggle-visual" /><div><strong>允許候補</strong><small>額滿後仍可排隊等候</small></div></label><label className="rule-toggle"><input type="checkbox" checked={ageLimit} onChange={(event) => setAgeLimit(event.target.checked)} /><span className="toggle-visual" /><div><strong>限制年齡</strong><small>參加者需符合年齡條件</small></div></label><label className="rule-toggle"><input type="checkbox" checked={allowCompanion} onChange={(event) => setAllowCompanion(event.target.checked)} /><span className="toggle-visual" /><div><strong>允許攜伴</strong><small>每位參加者可攜一位朋友</small></div></label></div>{ageLimit && <label className="form-field gender-field"><span>性別限制（選填）</span><input value={genderLimit} onChange={(event) => setGenderLimit(event.target.value)} placeholder="例如：女性限定" /></label>}{error && <div className="form-error"><X size={15} /> {error}</div>}<div className="form-footer"><div><ShieldCheck size={15} /><span>活動送出後會記錄在你的主辦活動中</span></div><button className="submit-create" disabled={submitting} type="submit">{submitting ? "建立中..." : "建立活動"} {!submitting && <ArrowUpRight size={17} />}</button></div></form></div></div>;
}
