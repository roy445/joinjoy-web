"use client";

import { Bell, Check, ChevronRight, Eye, EyeOff, KeyRound, LogOut, Mail, Moon, Palette, Save, Settings as SettingsIcon, ShieldCheck, Smartphone, Sun, UserRound, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type Settings = { emailNotifications: boolean; pushNotifications: boolean; eventReminders: boolean; messageNotifications: boolean; marketingEmails: boolean; publicProfile: boolean; showCreditScore: boolean; theme: "light" | "dark" | "system" };
type User = { id: string; name: string; email: string; role: "member" | "admin"; creditScore: number };

const defaultSettings: Settings = { emailNotifications: true, pushNotifications: false, eventReminders: true, messageNotifications: true, marketingEmails: false, publicProfile: true, showCreditScore: true, theme: "light" };

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [profileResponse, settingsResponse] = await Promise.all([fetch("/api/profile", { credentials: "include" }), fetch("/api/settings", { credentials: "include" })]);
      if (profileResponse.status === 401 || settingsResponse.status === 401) { window.location.href = "/"; return; }
      const profile = await profileResponse.json() as { user?: User; message?: string };
      const settingData = await settingsResponse.json() as { settings?: Settings; message?: string };
      if (!profileResponse.ok || !profile.user) throw new Error(profile.message ?? "無法取得帳號資料");
      if (!settingsResponse.ok || !settingData.settings) throw new Error(settingData.message ?? "無法取得設定");
      setUser(profile.user); setSettings(settingData.settings);
      applyTheme(settingData.settings.theme);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "目前無法載入設定"); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function applyTheme(theme: Settings["theme"]) {
    const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    localStorage.setItem("joinjoy-theme", theme);
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    const previous = settings[key];
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "theme") applyTheme(value as Settings["theme"]);
    setSavingKey(String(key)); setError(null);
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ [key]: value }) });
      const data = await response.json() as { settings?: Settings; message?: string };
      if (!response.ok) throw new Error(data.message ?? "設定儲存失敗");
      if (data.settings) setSettings(data.settings);
      setNotice("設定已儲存");
    } catch (updateError) { setSettings((current) => ({ ...current, [key]: previous })); setError(updateError instanceof Error ? updateError.message : "設定儲存失敗"); } finally { setSavingKey(null); }
  }

  async function changePassword() {
    setError(null);
    if (newPassword.length < 8) { setError("新密碼至少需要 8 個字元"); return; }
    if (newPassword !== confirmPassword) { setError("兩次輸入的新密碼不一致"); return; }
    setPasswordLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "密碼更新失敗");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setNotice(data.message ?? "密碼已更新");
    } catch (passwordError) { setError(passwordError instanceof Error ? passwordError.message : "密碼更新失敗"); } finally { setPasswordLoading(false); }
  }

  async function logout() { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.href = "/"; }
  if (loading) return <main className="account-page-loading"><SettingsIcon size={23} /><span>正在載入個人設定...</span></main>;

  return <main className="account-page settings-page"><header className="account-page-top"><a href="/" className="account-back"><ChevronRight className="back-chevron" size={17} /> 回到探索</a><div className="account-page-actions"><a href="/profile"><UserRound size={16} /> 個人資料</a><button onClick={() => void logout()}><LogOut size={16} /> 登出</button></div></header><div className="settings-heading"><span className="eyebrow">ACCOUNT PREFERENCES</span><h1>個人設定</h1><p>調整你的揪好咖體驗，讓每一次通知都剛剛好。</p></div>{error && <div className="settings-error"><X size={15} /> {error}</div>}<div className="settings-layout"><div className="settings-main"><section className="account-card settings-card"><div className="settings-card-heading"><span className="settings-icon teal"><Bell size={18} /></span><div><h2>通知偏好</h2><p>決定你想收到哪些活動與社群提醒。</p></div></div><div className="settings-list"><SettingToggle icon={<Mail size={16} />} title="Email 通知" description="收到報名、審核與帳號相關的重要信件" checked={settings.emailNotifications} loading={savingKey === "emailNotifications"} onChange={(value) => void updateSetting("emailNotifications", value)} /><SettingToggle icon={<Smartphone size={16} />} title="手機推播" description="在裝置上即時收到揪好咖提醒" checked={settings.pushNotifications} loading={savingKey === "pushNotifications"} onChange={(value) => void updateSetting("pushNotifications", value)} /><SettingToggle icon={<Bell size={16} />} title="活動開始提醒" description="活動開始前 24 小時與 1 小時提醒我" checked={settings.eventReminders} loading={savingKey === "eventReminders"} onChange={(value) => void updateSetting("eventReminders", value)} /><SettingToggle icon={<Mail size={16} />} title="聊天室與留言通知" description="有人留言、提及或聊天室有新訊息時通知我" checked={settings.messageNotifications} loading={savingKey === "messageNotifications"} onChange={(value) => void updateSetting("messageNotifications", value)} /><SettingToggle icon={<Mail size={16} />} title="揪好咖最新消息" description="接收新功能、活動推薦與社群故事" checked={settings.marketingEmails} loading={savingKey === "marketingEmails"} onChange={(value) => void updateSetting("marketingEmails", value)} /></div></section><section className="account-card settings-card"><div className="settings-card-heading"><span className="settings-icon lavender"><Eye size={18} /></span><div><h2>隱私與顯示</h2><p>管理其他會員可以看見哪些資訊。</p></div></div><div className="settings-list"><SettingToggle icon={<UserRound size={16} />} title="公開個人頁面" description="讓其他好咖可以看到你的公開自我介紹與興趣" checked={settings.publicProfile} loading={savingKey === "publicProfile"} onChange={(value) => void updateSetting("publicProfile", value)} /><SettingToggle icon={<StarIcon />} title="顯示信用分數" description="在個人頁面顯示你的社群信用分數" checked={settings.showCreditScore} loading={savingKey === "showCreditScore"} onChange={(value) => void updateSetting("showCreditScore", value)} /></div></section><section className="account-card settings-card"><div className="settings-card-heading"><span className="settings-icon peach"><Palette size={18} /></span><div><h2>外觀主題</h2><p>選擇你喜歡的瀏覽方式。</p></div></div><div className="theme-options">{[["light", "淺色模式", Sun], ["dark", "深色模式", Moon], ["system", "跟隨系統", SettingsIcon]].map(([value, label, Icon]) => <button key={String(value)} className={settings.theme === value ? "active" : ""} onClick={() => void updateSetting("theme", value as Settings["theme"])}><span><Icon size={17} /></span><strong>{String(label)}</strong>{settings.theme === value && <Check size={15} />}</button>)}</div></section><section className="account-card settings-card password-card"><div className="settings-card-heading"><span className="settings-icon yellow"><KeyRound size={18} /></span><div><h2>修改密碼</h2><p>定期更新密碼，保護你的帳號安全。</p></div></div><div className="password-form"><label><span>目前密碼</span><div><KeyRound size={15} /><input type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /><button type="button" onClick={() => setShowCurrent((value) => !value)}>{showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label><label><span>新密碼</span><div><KeyRound size={15} /><input type={showNew ? "text" : "password"} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" /><button type="button" onClick={() => setShowNew((value) => !value)}>{showNew ? <EyeOff size={15} /> : <Eye size={15} />}</button></div></label><label><span>確認新密碼</span><div><KeyRound size={15} /><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} autoComplete="new-password" /></div></label><button className="password-submit" onClick={() => void changePassword()} disabled={passwordLoading}>{passwordLoading ? "更新中..." : "更新密碼"}<ChevronRight size={15} /></button></div></section></div><aside className="settings-side"><section className="account-card account-summary-card"><div className="settings-account-avatar">{user?.name.slice(0, 1).toUpperCase()}</div><strong>{user?.name}</strong><span>{user?.email}</span><div className="summary-status"><Check size={13} /> 帳號運作正常</div><a href="/profile">查看我的個人頁面 <ChevronRight size={14} /></a></section><section className="account-card security-summary"><ShieldCheck size={21} /><div><strong>帳號安全</strong><p>目前密碼已加密保存。修改密碼後，其他裝置會自動登出。</p><a href="/profile">檢視帳號資訊</a></div></section><section className="account-card danger-card"><span className="eyebrow">SESSION</span><h3>需要離開嗎？</h3><p>在共用電腦上使用完畢後，請記得安全登出。</p><button onClick={() => void logout()}><LogOut size={15} /> 登出此帳號</button></section></aside></div>{notice && <div className="account-toast"><Check size={15} /> {notice}<button onClick={() => setNotice(null)}><X size={13} /></button></div>}</main>;
}

function StarIcon() { return <span className="mini-star">★</span>; }

function SettingToggle({ icon, title, description, checked, loading, onChange }: { icon: ReactNode; title: string; description: string; checked: boolean; loading: boolean; onChange: (value: boolean) => void }) {
  return <div className="setting-row"><span className="setting-row-icon">{icon}</span><div className="setting-row-copy"><strong>{title}</strong><p>{description}</p></div><button className={`toggle-switch ${checked ? "checked" : ""}`} onClick={() => onChange(!checked)} disabled={loading} aria-label={`切換${title}`}><i /></button></div>;
}
