import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// "onboarding@resend.dev" works out of the box on any Resend account without
// verifying a custom domain first, so real emails can be sent immediately
// once RESEND_API_KEY is configured. Once a custom domain is verified in the
// Resend dashboard, set MAIL_FROM to send from your own address instead.
const FROM = process.env.MAIL_FROM || "揪好咖 JoinJoy <onboarding@resend.dev>";
const MAIL_LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/logo.png` : "");

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendMailResult = { sent: boolean; error?: string };

export async function sendMail({ to, subject, html }: SendMailInput): Promise<SendMailResult> {
  if (!resend) {
    console.warn(`[mail] RESEND_API_KEY 尚未設定，未寄出真實郵件。收件人：${to}，主旨：${subject}`);
    return { sent: false, error: "RESEND_API_KEY_MISSING" };
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[mail] Resend 回傳錯誤", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    console.error("[mail] 寄送信件失敗", err);
    return { sent: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

function emailShell(title: string, bodyHtml: string, ctaLabel: string, ctaUrl: string) {
  return `
  <div style="font-family:'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f4f7fb; padding:32px 16px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:28px; overflow:hidden; box-shadow:0 28px 60px rgba(15,23,42,0.08);">
      <div style="background:linear-gradient(135deg,#4f46e5,#0ea5e9); padding:30px 28px; text-align:center; color:#ffffff;">
        <p style="margin:0; font-size:20px; font-weight:800; letter-spacing:0.04em;">揪好咖 JoinJoy</p>
        <p style="margin:8px 0 0; font-size:13px; color:rgba(255,255,255,0.88);">把喜歡的事，變成一起的事</p>
      </div>
      <div style="padding:32px 28px;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:24px;">
          ${MAIL_LOGO_URL ? `<img src="${MAIL_LOGO_URL}" alt="揪好咖 JoinJoy" width="52" height="52" style="border-radius:18px; object-fit:cover; display:block;" />` : `<div style="flex-shrink:0; width:52px; height:52px; border-radius:18px; background:linear-gradient(135deg,#4f46e5,#0ea5e9); display:flex; align-items:center; justify-content:center; color:#ffffff; font-size:24px; font-weight:800;">J</div>`}
          <div>
            <p style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${title}</p>
            <p style="margin:6px 0 0; font-size:13px; color:#64748b; line-height:1.6;">我們已經準備好驗證信，請點擊下方按鈕完成驗證。</p>
          </div>
        </div>
        <div style="font-size:15px; line-height:1.8; color:#334155; margin-bottom:28px;">${bodyHtml}</div>
        <div style="text-align:center; margin-bottom:28px;">
          <a href="${ctaUrl}" style="display:inline-block; background:#4f46e5; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px; padding:14px 32px; border-radius:999px; min-width:170px;">${ctaLabel}</a>
        </div>
        <div style="font-size:13px; line-height:1.7; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:20px;">
          <p style="margin:0 0 8px;">如果按鈕無法點擊，請複製以下連結至瀏覽器開啟：</p>
          <p style="margin:0; word-break:break-all;">${ctaUrl}</p>
        </div>
      </div>
      <div style="background:#f8fafc; padding:18px 24px; text-align:center; font-size:13px; color:#64748b;">
        <p style="margin:0;">如果你沒有請求此操作，請忽略此信件。</p>
        <p style="margin:6px 0 0;">© 2026 揪好咖 JoinJoy</p>
      </div>
    </div>
  </div>`;
}

export async function sendVerificationEmail(to: string, name: string, verifyUrl: string) {
  const html = emailShell(
    "驗證你的 Email 信箱",
    `嗨 ${name}，歡迎加入揪好咖！請點擊下方按鈕完成信箱驗證，驗證後即可享有完整的帳號功能與通知服務。此連結 24 小時內有效。`,
    "驗證我的信箱",
    verifyUrl
  );
  return sendMail({ to, subject: "【揪好咖】請驗證你的 Email 信箱", html });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = emailShell(
    "重設密碼",
    `我們收到了重設密碼的請求。請點擊下方按鈕設定新密碼，此連結 1 小時內有效。如果這不是你本人的操作，請忽略此封信件。`,
    "重設我的密碼",
    resetUrl
  );
  return sendMail({ to, subject: "【揪好咖】重設密碼連結", html });
}