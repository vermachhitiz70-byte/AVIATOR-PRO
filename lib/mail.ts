import nodemailer from "nodemailer";
import { getSettings } from "./db";

async function transporter() {
  const s = await getSettings();
  const host = s.smtpHost || process.env.SMTP_HOST || "";
  const user = s.smtpUser || process.env.SMTP_USER || "";
  const pass = s.smtpPass || process.env.SMTP_PASS || "";
  if (!host || !user || !pass) {
    throw new Error("Email service not configured. Admin must set SMTP in Admin → Settings (host, user, app-password).");
  }
  return nodemailer.createTransport({
    host,
    port: Number(s.smtpPort || process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user, pass },
  });
}

export async function sendOtpEmail(to: string, otp: string, purpose: "verify" | "reset" | "notice") {
  const t = await transporter();
  const s = await getSettings();
  const from = s.smtpUser || process.env.SMTP_USER || "";
  const subject =
    purpose === "verify" ? "Aviator Pro – Verify your email (OTP)" :
    purpose === "reset" ? "Aviator Pro – Password reset OTP" :
    "Aviator Pro – Notification";
  await t.sendMail({
    from: `Aviator Pro <${from}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;background:#060b16;color:#fff;padding:24px;border-radius:12px">
        <h2 style="color:#facc15">AVIATOR PRO</h2>
        <p>${purpose === "reset" ? "Use this OTP to reset your password:" : "Your verification OTP is:"}</p>
        <p style="font-size:32px;font-weight:900;letter-spacing:8px;color:#facc15">${otp}</p>
        <p style="color:#94a3b8">Valid for 10 minutes. Never share this code.</p>
      </div>`,
  });
}
