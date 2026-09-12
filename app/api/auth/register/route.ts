import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, otp6, uid } from "@/lib/db";
import { hashPassword, nextReferralCode } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";

// PRD 3.1: register creates INACTIVE account + mandatory email OTP.
// No session until OTP verified (fixes "register without OTP" bug).
// Dev mode (no SMTP configured): OTP is returned in response + server log.
export async function POST(req: NextRequest) {
  await initDb();
  const { name, mobile, email, referral, password, confirm, country } = await req.json();
  if (!name || !mobile || !email || !password) return NextResponse.json({ ok: false, error: "All fields required" }, { status: 400 });
  if (confirm !== undefined && confirm !== password) return NextResponse.json({ ok: false, error: "Passwords do not match" }, { status: 400 });
  const settings = await getSettings();
  if (settings.maintenanceMode === "on") return NextResponse.json({ ok: false, error: "Platform under maintenance. Try later." }, { status: 503 });
  const db = getDb();
  const dup = await db.execute({ sql: "SELECT id FROM users WHERE email=? OR mobile=?", args: [email, mobile] });
  if (dup.rows.length) return NextResponse.json({ ok: false, error: "Email or mobile number is already registered." }, { status: 400 });
  let sponsor: string | null = null;
  if (referral) {
    const s = await db.execute({ sql: "SELECT referral_code FROM users WHERE referral_code=?", args: [referral] });
    if (s.rows.length === 0) return NextResponse.json({ ok: false, error: "Invalid Referral ID" }, { status: 400 });
    sponsor = referral;
  }
  const id = uid("U");
  const code = nextReferralCode();
  const hash = await hashPassword(password);
  const otp = otp6();
  const expiry = new Date(Date.now() + 10 * 60000).toISOString();
  await db.execute({
    sql: "INSERT INTO users (id,name,mobile,email,country,password_hash,referral_code,referred_by,root_referral,is_active,otp_code,otp_expiry) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    args: [id, name, mobile, email, country || "", hash, code, sponsor, "ROOT0001", 0, otp, expiry],
  });
  await db.execute({ sql: "INSERT INTO wallets (user_id) VALUES (?)", args: [id] });
  try {
    await sendOtpEmail(email, otp, "verify");
  } catch (e) {
    await db.execute({ sql: "DELETE FROM wallets WHERE user_id=?", args: [id] });
    await db.execute({ sql: "DELETE FROM users WHERE id=?", args: [id] });
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not send OTP email" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    needOtp: true,
    email,
    referral_code: code,
  });
}
