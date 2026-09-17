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

export async function sendOtpEmail(to: string, otp: string, purpose: "verify" | "reset" | "notice") {  const t = await transporter();
  const s = await getSettings();
  const from = s.smtpUser || process.env.SMTP_USER || "";
  const subject =
    purpose === "verify" ? "Aviator Smart AI – Verify your email (OTP)" :
    purpose === "reset" ? "Aviator Smart AI – Password reset OTP" :
    "Aviator Smart AI – Notification";
  await t.sendMail({
    from: `Aviator Smart AI <${from}>`,
    to,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;background:#060b16;color:#fff;padding:24px;border-radius:12px">
        <h2 style="color:#facc15">AVIATOR SMART AI</h2>
        <p>${purpose === "reset" ? "Use this OTP to reset your password:" : "Your verification OTP is:"}</p>
        <p style="font-size:32px;font-weight:900;letter-spacing:8px;color:#facc15">${otp}</p>
        <p style="color:#94a3b8">Valid for 10 minutes. Never share this code.</p>
      </div>`,
  });
}

// Client rule: on final registration (OTP activation), email the member their
// UserID + a fresh login password. Throws when SMTP is not configured
// (caller should catch — account activation must never fail because of mail).
export async function sendCredentialsEmail(to: string, name: string, userId: string, password: string) {
  const t = await transporter();
  const s = await getSettings();
  const from = s.smtpUser || process.env.SMTP_USER || "";
  await t.sendMail({
    from: `Aviator Smart AI <${from}>`,
    to,
    subject: "Aviator Smart AI – Your login details",
    html: `
      <div style="font-family:Arial,sans-serif;background:#060b16;color:#fff;padding:24px;border-radius:12px">
        <h2 style="color:#facc15">AVIATOR SMART AI</h2>
        <p>Hi ${name}, your account is active. Here are your login details:</p>
        <p>User ID (login): <b style="color:#facc15">${userId}</b></p>
        <p>Password: <b style="font-size:20px;letter-spacing:2px;color:#facc15">${password}</b></p>
        <p style="color:#94a3b8">Keep them safe and never share them. You can withdraw daily 8:00–10:00 AM IST.</p>
      </div>`,
  });
}
