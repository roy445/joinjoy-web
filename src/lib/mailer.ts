import nodemailer from "nodemailer";

export async function sendSupportMail(subject: string, text: string) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.ERROR_REPORT_TO || "r03259468@gmail.com";
  if (!user || !pass) return { sent: false, reason: "MAIL-002" };
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_PORT || "465") === "465",
    auth: { user, pass },
  });
  await transporter.sendMail({ from: user, to, subject, text });
  return { sent: true };
}
