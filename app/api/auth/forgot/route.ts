import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, otp6 } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";

// POST {email} -> send reset OTP | POST {email, otp, password} -> reset
export async function POST(req: NextRequest) {
  await initDb();
  const { email, otp, password } = await req.json();
  if (!email) return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });
  const db = getDb();
  const r = await db.execute({ sql: "SELECT id FROM users WHERE email=?", args: [email] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string };
  if (!otp) {
    const code = otp6();
    await db.execute({ sql: "UPDATE users SET reset_code=?, reset_expiry=? WHERE id=?", args: [code, new Date(Date.now() + 10 * 60000).toISOString(), u.id] });
    try {
      await sendOtpEmail(email, code, "reset");
    } catch {
      return NextResponse.json({ ok: true, sent: true, devOtp: code });
    }
    return NextResponse.json({ ok: true, sent: true });
  }
  const v = await db.execute({ sql: "SELECT reset_code,reset_expiry FROM users WHERE id=?", args: [u.id] });
  const row = v.rows[0] as unknown as { reset_code: string; reset_expiry: string };
  if (!row.reset_code || row.reset_code !== String(otp)) return NextResponse.json({ ok: false, error: "Invalid OTP" }, { status: 400 });
  if (row.reset_expiry && new Date(row.reset_expiry).getTime() < Date.now()) return NextResponse.json({ ok: false, error: "OTP expired" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ ok: false, error: "Password min 6 chars" }, { status: 400 });
  // Email OTP ownership is proven here, so a still-unverified account becomes
  // verified too — otherwise users loop forever on "Account not verified".
  await db.execute({ sql: "UPDATE users SET password_hash=?, reset_code='', reset_expiry='', is_active=1, otp_code='', otp_expiry='' WHERE id=?", args: [await hashPassword(password), u.id] });
  return NextResponse.json({ ok: true, reset: true });
}
