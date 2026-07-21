import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// "onboarding@resend.dev" works out of the box on any Resend account without
// verifying a custom domain first, so real emails can be sent immediately
// once RESEND_API_KEY is configured. Once a custom domain is verified in the
// Resend dashboard, set MAIL_FROM to send from your own address instead.
const FROM = process.env.MAIL_FROM || "揪好咖 JoinJoy <onboarding@resend.dev>";

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
  <div style="font-family: 'Noto Sans TC', -apple-system, sans-serif; background:#faf7f0; padding: 32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 30px rgba(31,65,60,0.08);">
      <div style="background:linear-gradient(135deg,#339990,#257d77);padding:28px 24px;text-align:center;">
        <p style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">揪好咖 JoinJoy</p>
        <p style="margin:4px 0 0;color:#eafaf7;font-size:12px;letter-spacing:2px;">把喜歡的事，變成一起的事</p>
      </div>
      <div style="padding:28px 24px;">
        <h1 style="margin:0 0 12px;font-size:18px;color:#1f2937;">${title}</h1>
        <div style="font-size:14px;line-height:1.7;color:#4b5563;">${bodyHtml}</div>
        <div style="text-align:center;margin-top:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#ee7f57,#e5673f);color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 28px;border-radius:999px;">${ctaLabel}</a>
        </div>
        <p style="margin-top:20px;font-size:12px;color:#9ca3af;word-break:break-all;">如果按鈕無法點擊，請複製以下連結至瀏覽器開啟：<br/>${ctaUrl}</p>
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