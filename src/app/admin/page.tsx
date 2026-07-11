"use client";

import { BarChart3, Check, Copy, FileCheck2, Flag, KeyRound, LayoutDashboard, LogOut, RefreshCw, ShieldAlert, ShieldCheck, UserRound, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type AdminUser = { id: string; name: string; email: string; role: string; status: string; creditScore: number; createdAt: string };
type RequestItem = { id: string; userId: string; userName: string; userEmail: string; reason: string; status: string; createdAt: string };
type CodeItem = { id: string; label: string | null; usedBy: string | null; usedAt: string | null; expiresAt: string | null; createdAt: string };
type ReportItem = { id: string; eventId: string | null; reason: string; details: string | null; status: string; createdAt: string; reporterName: string };
type Stats = { members: number; events: number; participants: number; auditLogs: number; popularCategories: { category: string; count: number }[] };

async function readJson<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, { credentials: "include", ...options });
  const data = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "操作失敗");
  return data;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("總覽");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [codes, setCodes] = useState<CodeItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [statsResponse, usersResponse, requestsResponse, codesResponse, reportsResponse] = await Promise.all([
        readJson<{ stats: Stats }>("/api/admin/stats"),
        readJson<{ users: AdminUser[] }>("/api/admin/users"),
        readJson<{ requests: RequestItem[] }>("/api/create-requests"),
        readJson<{ codes: CodeItem[] }>("/api/admin/codes"),
        readJson<{ reports: ReportItem[] }>("/api/admin/reports"),
      ]);
      setStats(statsResponse.stats); setUsers(usersResponse.users); setRequests(requestsResponse.requests); setCodes(codesResponse.codes); setReports(reportsResponse.reports);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "無法載入後台資料");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  async function reviewRequest(id: string, status: "approved" | "rejected") {
    try { await readJson(`/api/admin/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); setNotice(status === "approved" ? "申請已核准" : "申請已拒絕"); void load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "操作失敗"); }
  }

  async function toggleUser(user: AdminUser) {
    try { await readJson("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id, status: user.status === "active" ? "suspended" : "active" }) }); setNotice(user.status === "active" ? "會員已停權" : "會員已解除停權"); void load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "操作失敗"); }
  }

  async function createCode() {
    try { const result = await readJson<{ code: string }>("/api/admin/codes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "後台產生代碼", expiresInDays: 30 }) }); setNewCode(result.code); setNotice("一次性代碼已產生，請立即複製保存"); void load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "代碼產生失敗"); }
  }

  async function revokeCode(id: string) {
    try { await readJson(`/api/admin/codes?id=${id}`, { method: "DELETE" }); setNotice("代碼已撤銷"); void load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "代碼撤銷失敗"); }
  }

  async function reviewReport(id: string, status: "approved" | "rejected") {
    try { await readJson("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: id, status }) }); setNotice("檢舉案件已更新"); void load(); } catch (actionError) { setError(actionError instanceof Error ? actionError.message : "案件更新失敗"); }
  }

  const tabs = [{ label: "總覽", icon: LayoutDashboard }, { label: "會員管理", icon: Users }, { label: "建立申請", icon: FileCheck2 }, { label: "一次性代碼", icon: KeyRound }, { label: "檢舉案件", icon: Flag }];
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span>✦</span><div><strong>揪好咖</strong><small>ADMIN CONSOLE</small></div></div><div className="admin-nav">{tabs.map(({ label, icon: Icon }) => <button key={label} className={activeTab === label ? "active" : ""} onClick={() => setActiveTab(label)}><Icon size={17} /> {label}{label === "建立申請" && requests.filter((item) => item.status === "pending").length > 0 && <em>{requests.filter((item) => item.status === "pending").length}</em>}</button>)}</div><div className="admin-safe"><ShieldCheck size={17} /><strong>安全管理模式</strong><small>所有操作都會記錄</small></div><a className="admin-back" href="/"><LogOut size={15} /> 回到前台</a></aside><main className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">JOINJOY CONTROL CENTER</span><h1>{activeTab}</h1></div><div className="admin-top-actions"><button onClick={() => void load()}><RefreshCw size={15} /> 重新整理</button><div className="admin-avatar"><ShieldAlert size={16} /></div></div></header>{loading && <div className="admin-loading"><RefreshCw size={18} /> 正在載入管理資料...</div>}{error && <div className="admin-error"><ShieldAlert size={16} /> {error}<button onClick={() => setError(null)}><X size={15} /></button></div>}{notice && <div className="admin-notice"><Check size={16} /> {notice}<button onClick={() => setNotice(null)}><X size={15} /></button></div>}{!loading && !error && <>{activeTab === "總覽" && <section className="admin-content"><div className="admin-stat-grid"><div><span><Users size={17} /></span><small>會員總數</small><strong>{stats?.members ?? 0}</strong><em>持續成長中</em></div><div><span><LayoutDashboard size={17} /></span><small>活動總數</small><strong>{stats?.events ?? 0}</strong><em>公開與私人活動</em></div><div><span><BarChart3 size={17} /></span><small>報名人次</small><strong>{stats?.participants ?? 0}</strong><em>累計參與紀錄</em></div><div><span><ShieldCheck size={17} /></span><small>操作紀錄</small><strong>{stats?.auditLogs ?? 0}</strong><em>完整稽核保存</em></div></div><div className="admin-panels"><div className="admin-panel"><div className="admin-panel-title"><div><span className="eyebrow">POPULAR CATEGORIES</span><h2>熱門活動分類</h2></div><BarChart3 size={18} /></div>{stats?.popularCategories.map((item, index) => <div className="category-stat" key={item.category}><span>{String(index + 1).padStart(2, "0")}</span><strong>{item.category}</strong><div><i style={{ width: `${Math.min(100, item.count * 12)}%` }} /></div><small>{item.count}</small></div>)}</div><div className="admin-panel"><div className="admin-panel-title"><div><span className="eyebrow">NEEDS ATTENTION</span><h2>待處理事項</h2></div><ShieldAlert size={18} /></div><button className="admin-task" onClick={() => setActiveTab("建立申請")}><FileCheck2 size={17} /><span>待審核建立申請</span><strong>{requests.filter((item) => item.status === "pending").length}</strong></button><button className="admin-task" onClick={() => setActiveTab("檢舉案件")}><Flag size={17} /><span>待處理檢舉案件</span><strong>{reports.filter((item) => item.status === "pending").length}</strong></button><button className="admin-task" onClick={() => setActiveTab("一次性代碼")}><KeyRound size={17} /><span>仍有效的一次性代碼</span><strong>{codes.filter((item) => !item.usedAt).length}</strong></button></div></div></section>}{activeTab === "會員管理" && <section className="admin-content"><div className="admin-section-intro"><div><span className="eyebrow">MEMBER DIRECTORY</span><h2>管理所有會員</h2><p>停權、解除停權與查看會員信用分數。</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>會員</th><th>角色</th><th>信用分數</th><th>狀態</th><th>加入時間</th><th>操作</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><div className="table-user"><span>{user.name.slice(0, 1)}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></td><td><span className="role-pill">{user.role === "admin" ? "管理員" : "會員"}</span></td><td><strong className="credit-score">{user.creditScore}</strong></td><td><span className={`status-pill ${user.status}`}>{user.status === "active" ? "正常" : "已停權"}</span></td><td>{new Date(user.createdAt).toLocaleDateString("zh-TW")}</td><td><button className="table-action" onClick={() => void toggleUser(user)}>{user.status === "active" ? "停權" : "解除停權"}</button></td></tr>)}</tbody></table></div></section>}{activeTab === "建立申請" && <section className="admin-content"><div className="admin-section-intro"><div><span className="eyebrow">CREATOR REQUESTS</span><h2>審核建立活動申請</h2><p>確認會員身分與申請理由後，核准一次建立活動的權限。</p></div></div><div className="admin-request-list">{requests.length === 0 && <div className="admin-empty">目前沒有建立活動申請</div>}{requests.map((item) => <div className="request-row" key={item.id}><div className="request-avatar">{item.userName.slice(0, 1)}</div><div className="request-copy"><strong>{item.userName} <small>{item.userEmail}</small></strong><p>{item.reason}</p><span>{new Date(item.createdAt).toLocaleString("zh-TW")}</span></div><span className={`status-pill ${item.status}`}>{item.status === "pending" ? "待審核" : item.status === "approved" ? "已核准" : "已拒絕"}</span>{item.status === "pending" && <div className="request-actions"><button onClick={() => void reviewRequest(item.id, "approved")}><Check size={15} /> 同意</button><button onClick={() => void reviewRequest(item.id, "rejected")}><X size={15} /> 拒絕</button></div>}</div>)}</div></section>}{activeTab === "一次性代碼" && <section className="admin-content"><div className="admin-section-intro code-intro"><div><span className="eyebrow">ONE-TIME ACCESS</span><h2>建立活動代碼</h2><p>每組代碼只能使用一次，產生後請安全地提供給指定會員。</p></div><button className="admin-primary" onClick={() => void createCode()}><KeyRound size={16} /> 產生新代碼</button></div>{newCode && <div className="new-code-banner"><div><span>新的一次性代碼</span><strong>{newCode}</strong></div><button onClick={() => { void navigator.clipboard?.writeText(newCode); setNotice("代碼已複製"); }}><Copy size={15} /> 複製</button></div>}<div className="admin-table-wrap"><table><thead><tr><th>代碼標籤</th><th>狀態</th><th>到期日</th><th>建立時間</th><th>管理</th></tr></thead><tbody>{codes.map((code) => <tr key={code.id}><td><strong>{code.label ?? "未命名代碼"}</strong><small className="table-sub">ID: {code.id.slice(0, 8)}</small></td><td><span className={`status-pill ${code.usedAt ? "suspended" : "active"}`}>{code.usedAt ? "已使用" : "可使用"}</span></td><td>{code.expiresAt ? new Date(code.expiresAt).toLocaleDateString("zh-TW") : "不限期"}</td><td>{new Date(code.createdAt).toLocaleDateString("zh-TW")}</td><td>{!code.usedAt && <button className="table-action danger" onClick={() => void revokeCode(code.id)}>撤銷</button>}</td></tr>)}</tbody></table></div></section>}{activeTab === "檢舉案件" && <section className="admin-content"><div className="admin-section-intro"><div><span className="eyebrow">SAFETY REPORTS</span><h2>處理檢舉案件</h2><p>維護揪好咖的友善與安全社群環境。</p></div></div><div className="admin-request-list">{reports.length === 0 && <div className="admin-empty">目前沒有檢舉案件</div>}{reports.map((report) => <div className="request-row report-row" key={report.id}><div className="report-icon"><Flag size={17} /></div><div className="request-copy"><strong>{report.reason} <small>由 {report.reporterName} 提出</small></strong><p>{report.details ?? "未提供補充說明"}</p><span>{new Date(report.createdAt).toLocaleString("zh-TW")} · 活動 ID {report.eventId?.slice(0, 8) ?? "-"}</span></div><span className={`status-pill ${report.status}`}>{report.status === "pending" ? "待處理" : "已結案"}</span>{report.status === "pending" && <div className="request-actions"><button onClick={() => void reviewReport(report.id, "approved")}><Check size={15} /> 受理</button><button onClick={() => void reviewReport(report.id, "rejected")}><X size={15} /> 駁回</button></div>}</div>)}</div></section>}</>}</main></div>;
}
