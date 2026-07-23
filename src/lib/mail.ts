import nodemailer from "nodemailer";
import { Resend } from "resend";

const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const FROM = process.env.MAIL_FROM || EMAIL_USER;
const MAIL_LOGO_URL =
  process.env.MAIL_LOGO_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/logo.png` : "");
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const RESEND_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type SendMailResult = { sent: boolean; error?: string };

function normalizeError(err: unknown) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "unknown";
  }
}

function getTransportConfig() {
  if (!EMAIL_USER || !EMAIL_PASS) {
    return null;
  }

  const common = {
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  if (EMAIL_SERVICE) {
    return {
      ...common,
      service: EMAIL_SERVICE,
    };
  }

  if (EMAIL_HOST && EMAIL_PORT) {
    return {
      ...common,
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
    };
  }

  return null;
}

const transporterConfig = getTransportConfig();
const transporter = transporterConfig ? nodemailer.createTransport(transporterConfig) : null;

async function sendViaSmtp({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  if (!transporter || !FROM) {
    return { sent: false, error: "SMTP_CONFIG_MISSING" };
  }

  try {
    await transporter.sendMail({
      from: FROM,
      to,
      subject,
      text,
      html,
    });
    console.log(`[mail] SMTP 發送成功：${subject} -> ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[mail] SMTP 寄送失敗", err);
    return { sent: false, error: normalizeError(err) };
  }
}

async function sendViaResend({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY_MISSING" };
  }

  try {
    const result = await resend.emails.send({ from: RESEND_FROM, to, subject, html, text });
    if (!result || (result as any).status === "failed" || (result as any).error) {
      const errMsg = (result as any)?.error?.message || normalizeError(result);
      console.error("[mail] Resend 發送失敗", result);
      return { sent: false, error: errMsg };
    }
    console.log(`[mail] Resend 發送成功：${subject} -> ${to}`);
    return { sent: true };
  } catch (err) {
    console.error("[mail] Resend 寄送失敗", err);
    return { sent: false, error: normalizeError(err) };
  }
}

export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<SendMailResult> {
  const smtpResult = await sendViaSmtp({ to, subject, html, text });
  if (smtpResult.sent) return smtpResult;

  if (resend) {
    console.warn(`[mail] SMTP 無法發送，改用 Resend 發信：${smtpResult.error}`);
    const resendResult = await sendViaResend({ to, subject, html, text });
    return resendResult.sent ? resendResult : { sent: false, error: `SMTP: ${smtpResult.error}; Resend: ${resendResult.error}` };
  }

  return smtpResult;
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
            <p style="margin:6px 0 0; font-size:13px; color:#64748b; line-height:1.6;">我們已經準備好信件，請點擊下方按鈕完成後續操作。</p>
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

function plainTextShell(title: string, body: string, ctaLabel: string, ctaUrl: string) {
  return `${title}\n\n${body}\n\n${ctaLabel}: ${ctaUrl}\n\n如果按鈕無法點擊，請複製連結到瀏覽器開啟。\n\n如果你沒有請求此操作，請忽略此信件。`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const body = `我們收到了重設密碼的請求。請點擊下方按鈕設定新密碼，此連結 1 小時內有效。如果這不是你本人的操作，請忽略此封信件。`;
  const html = emailShell("重設密碼", body, "重設我的密碼", resetUrl);
  const text = plainTextShell("重設密碼", body, "重設我的密碼", resetUrl);
  return sendMail({ to, subject: "【揪好咖】重設密碼連結", html, text });
}