"use client";

import { ArrowLeft, CalendarDays, Check, ChevronRight, Heart, Image as ImageIcon, LogOut, MapPin, Pencil, Plus, Save, Settings, ShieldCheck, Star, Ticket, UserRound, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: "member" | "admin";
  status: "active" | "suspended";
  bio: string | null;
  avatarUrl: string | null;
  interests: string[];
  creditScore: number;
  createdAt: string;
};
type Activity = { id: string; title: string; coverUrl: string; category: string; startAt: string; endAt: string; location: string; status: string; participantStatus?: string };
type ProfileData = { user: ProfileUser };
type ActivityData = { stats: { hosted: number; joined: number; favorites: number; creditScore: number }; activities: { hosted: Activity[]; joined: Activity[]; favorites: Activity[] } };

const interestOptions = ["戶外探索", "美食同好", "運動健身", "藝文手作", "桌遊娛樂", "攝影", "咖啡", "旅行", "音樂", "閱讀"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "short", day: "numeric", weekday: "short" }).format(new Date(value));
}

export default function ProfilePage() {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [tab, setTab] = useState<"joined" | "hosted" | "favorites">("joined");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [profileResponse, activityResponse] = await Promise.all([fetch("/api/profile", { credentials: "include" }), fetch("/api/profile/activity", { credentials: "include" })]);
      if (profileResponse.status === 401) { window.location.href = "/"; return; }
      const profile = await profileResponse.json() as ProfileData & { message?: string };
      const activities = await activityResponse.json() as ActivityData & { message?: string };
      if (!profileResponse.ok || !profile.user) throw new Error(profile.message ?? "無法取得個人資料");
      setUser(profile.user); setName(profile.user.name); setBio(profile.user.bio ?? ""); setAvatarUrl(profile.user.avatarUrl ?? ""); setInterests(profile.user.interests ?? []);
      if (activityResponse.ok) setActivity(activities);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "目前無法載入個人頁面"); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function saveProfile() {
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name, bio, avatarUrl, interests }) });
      const data = await response.json() as ProfileData & { message?: string };
      if (!response.ok) throw new Error(data.message ?? "儲存失敗");
      setUser(data.user); setEditing(false); setNotice("個人資料已更新");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "儲存失敗"); } finally { setSaving(false); }
  }

  function addInterest(value = newInterest) {
    const interest = value.trim();
    if (interest && !interests.includes(interest) && interests.length < 20) setInterests((current) => [...current, interest]);
    setNewInterest("");
  }
  function removeInterest(interest: string) { setInterests((current) => current.filter((item) => item !== interest)); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/"; }

  const visibleActivities = useMemo(() => activity?.activities[tab] ?? [], [activity, tab]);
  if (loading) return <main className="account-page-loading"><UserRound size={23} /><span>正在載入個人資料...</span></main>;
  if (!user) return <main className="account-page-loading"><p>{error ?? "找不到個人資料"}</p><a href="/">回到首頁</a></main>;

  return <main className="account-page"><header className="account-page-top"><a href="/" className="account-back"><ArrowLeft size={17} /> 回到探索</a><div className="account-page-actions"><a href="/settings"><Settings size={16} /> 個人設定</a><button onClick={() => void logout()}><LogOut size={16} /> 登出</button></div></header><section className="profile-hero"><div className="profile-cover-decoration" /><div className="profile-hero-content"><div className="profile-large-avatar">{avatarUrl ? <img src={avatarUrl} alt={`${user.name} 的頭像`} /> : user.name.slice(0, 1).toUpperCase()}<span /></div><div className="profile-hero-copy"><span className="eyebrow">JOINJOY EXPLORER</span><h1>{user.name}</h1><p>{user.bio || "還沒有寫下自我介紹，分享一點你的喜好吧。"}</p><div className="profile-meta"><span><UserRound size={13} /> {user.role === "admin" ? "管理員" : "探索者"}</span><span><CalendarDays size={13} /> {new Date(user.createdAt).toLocaleDateString("zh-TW")} 加入</span></div></div><div className="profile-hero-buttons"><button className="profile-edit-button" onClick={() => setEditing((value) => !value)}><Pencil size={15} /> {editing ? "取消編輯" : "編輯資料"}</button></div></div></section><section className="profile-layout"><div className="profile-main"><div className="profile-stat-row"><div><span className="stat-icon teal"><Ticket size={17} /></span><small>已參加活動</small><strong>{activity?.stats.joined ?? 0}</strong></div><div><span className="stat-icon peach"><Heart size={17} /></span><small>收藏活動</small><strong>{activity?.stats.favorites ?? 0}</strong></div><div><span className="stat-icon lavender"><Users size={17} /></span><small>建立活動</small><strong>{activity?.stats.hosted ?? 0}</strong></div><div><span className="stat-icon yellow"><Star size={17} /></span><small>信用分數</small><strong>{user.creditScore}</strong></div></div>{editing && <section className="profile-edit-card account-card"><div className="account-card-heading"><div><span className="eyebrow">EDIT PROFILE</span><h2>編輯個人資料</h2></div><button onClick={() => setEditing(false)}><X size={17} /></button></div><div className="profile-form-grid"><label><span>暱稱</span><input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} /></label><label><span>頭像網址</span><div className="profile-input-icon"><ImageIcon size={15} /><input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></div></label><label className="full"><span>自我介紹</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={500} placeholder="告訴大家你喜歡什麼、正在尋找什麼樣的活動..." /></label></div><div className="interest-editor"><span>興趣標籤</span><div className="interest-chips">{interests.map((interest) => <button type="button" key={interest} onClick={() => removeInterest(interest)}># {interest} <X size={11} /></button>)}</div><div className="add-interest"><input value={newInterest} onChange={(event) => setNewInterest(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addInterest(); } }} placeholder="新增興趣，按 Enter 加入" /><button type="button" onClick={() => addInterest()}><Plus size={15} /></button></div><div className="interest-suggestions">{interestOptions.filter((item) => !interests.includes(item)).slice(0, 6).map((item) => <button type="button" key={item} onClick={() => addInterest(item)}>+ {item}</button>)}</div></div>{error && <div className="account-form-error">{error}</div>}<div className="profile-save-row"><span><ShieldCheck size={14} /> 你的 Email 不會公開顯示</span><button onClick={() => void saveProfile()} disabled={saving}><Save size={15} /> {saving ? "儲存中..." : "儲存變更"}</button></div></section>}<section className="account-card activity-card"><div className="account-card-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>你的活動足跡</h2></div><a href="/">探索更多 <ChevronRight size={14} /></a></div><div className="activity-tabs">{[["joined", "已報名"], ["hosted", "我建立的"], ["favorites", "我的收藏"]].map(([value, label]) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value as typeof tab)}>{label}<small>{activity?.stats[value as "joined" | "hosted" | "favorites"] ?? 0}</small></button>)}</div>{visibleActivities.length > 0 ? <div className="profile-activity-list">{visibleActivities.map((item) => <a href={`/events/${item.id}`} className="profile-activity-item" key={item.id}><div className="profile-activity-cover" style={{ backgroundImage: `url(${item.coverUrl})` }} /><div className="profile-activity-copy"><span>{item.category}</span><strong>{item.title}</strong><small><CalendarDays size={12} /> {formatDate(item.startAt)}</small><small><MapPin size={12} /> {item.location}</small></div><ChevronRight size={16} /></a>)}</div> : <div className="profile-empty"><Ticket size={25} /><strong>這裡還沒有活動</strong><p>{tab === "joined" ? "去探索一場活動，留下你的第一個足跡吧。" : tab === "hosted" ? "取得建立活動權限，發起一場屬於你的聚會。" : "把喜歡的活動收藏起來，之後再慢慢決定。"}</p><a href="/">開始探索 <ChevronRight size={14} /></a></div>}</section></div><aside className="profile-side"><section className="account-card credit-card"><div className="credit-card-orbit"><Star size={19} /></div><span className="eyebrow">JOINJOY CREDIT</span><strong>{user.creditScore}</strong><p>你的社群信用分數</p><div className="credit-scale"><i style={{ width: `${Math.min(100, user.creditScore / 2)}%` }} /></div><small>{user.creditScore >= 120 ? "很棒！大家都喜歡和你一起活動" : "持續參與友善活動，累積更多信用"}</small></section><section className="account-card interest-card"><div className="account-card-heading"><div><span className="eyebrow">YOUR INTERESTS</span><h2>你的興趣</h2></div><button onClick={() => setEditing(true)}><Pencil size={14} /></button></div><div className="profile-interest-display">{user.interests.length > 0 ? user.interests.map((interest) => <span key={interest}># {interest}</span>) : <p>編輯資料，加入你的興趣標籤。</p>}</div></section><section className="account-card security-card"><ShieldCheck size={19} /><div><strong>帳號安全</strong><p>Email 已驗證，Session 受 HttpOnly Cookie 保護。</p><a href="/settings">前往安全設定 <ChevronRight size={13} /></a></div></section></aside></section>{notice && <div className="account-toast"><Check size={15} /> {notice}<button onClick={() => setNotice(null)}><X size={13} /></button></div>}</main>;
}
