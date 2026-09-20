import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, otp6, uid } from "@/lib/db";
import { hashPassword, nextReferralCode } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";

// PRD 3.1: register creates INACTIVE account + mandatory email OTP.
// No session until OTP verified (fixes "register without OTP" bug).
// Dev mode (no SMTP configured): OTP is returned in response + server log.
export async function POST(req: NextRequest) {
  await initDb();
  const { name, mobile, email, referral, country } = await req.json();
  if (!name || !mobile || !email) return NextResponse.json({ ok: false, error: "Name, mobile and email are required" }, { status: 400 });
  const settings = await getSettings();
  if (settings.maintenanceMode === "on") return NextResponse.json({ ok: false, error: "Platform under maintenance. Try later." }, { status: 503 });
  const db = getDb();
  // Back-button case: email exists but never verified -> resend OTP, continue signup.
  const existing = await db.execute({ sql: "SELECT id,is_active,referral_code FROM users WHERE email=?", args: [email] });
  if (existing.rows.length) {
    const ex = existing.rows[0] as unknown as { id: string; is_active: number; referral_code: string };
    if (ex.is_active) return NextResponse.json({ ok: false, error: "Email is already registered. Please log in." }, { status: 400 });
    const otp = otp6();
    await db.execute({ sql: "UPDATE users SET otp_code=?,otp_expiry=? WHERE id=?", args: [otp, new Date(Date.now() + 10 * 60000).toISOString(), ex.id] });
    let devOtp: string | undefined = undefined;
    try {
      await sendOtpEmail(email, otp, "verify");
    } catch {
      devOtp = otp;
    }
    return NextResponse.json({ ok: true, needOtp: true, email, referral_code: ex.referral_code, resumed: true, ...(devOtp ? { devOtp } : {}) });
  }
  const dupMob = await db.execute({ sql: "SELECT id FROM users WHERE mobile=?", args: [mobile] });
  if (dupMob.rows.length) return NextResponse.json({ ok: false, error: "Mobile number is already registered." }, { status: 400 });
  // Referral is compulsory — no signup without a valid sponsor code.
  // (Old NULL rows were backfilled to admin by migration; new rows always carry a sponsor.)
  if (!referral || !String(referral).trim()) return NextResponse.json({ ok: false, error: "Referral ID is compulsory" }, { status: 400 });
  const s = await db.execute({ sql: "SELECT referral_code FROM users WHERE referral_code=?", args: [String(referral).trim()] });
  if (s.rows.length === 0) return NextResponse.json({ ok: false, error: "Invalid Referral ID" }, { status: 400 });
  const sponsor: string = String(referral).trim();
  const id = uid("U");
  const code = nextReferralCode();
  // Password is system-generated and emailed after OTP verification; use a placeholder until then.
  const placeholder = `Av${Math.floor(100000 + Math.random() * 900000)}!`;
  const hash = await hashPassword(placeholder);
  const otp = otp6();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString();
  await db.execute({
    sql: "INSERT INTO users (id,name,mobile,email,country,password_hash,referral_code,referred_by,root_referral,is_active,otp_code,otp_expiry) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    args: [id, name, mobile, email, country || "", hash, code, sponsor, "ROOT0001", 0, otp, expiry],
  });
  await db.execute({ sql: "INSERT INTO wallets (user_id) VALUES (?)", args: [id] });
  let devOtp: string | undefined = undefined;
  try {
    await sendOtpEmail(email, otp, "verify");
  } catch (e) {
    console.warn("SMTP failed, falling back to dev OTP:", (e as Error).message);
    devOtp = otp; // show on screen for testing until App Password is set
  }
  return NextResponse.json({
    ok: true,
    needOtp: true,
    email,
    referral_code: code,
    ...(devOtp ? { devOtp } : {}),
  });
}
