import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, otp6 } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mail";

// POST { email } -> issues a fresh OTP for pending accounts (real email)
export async function POST(req: NextRequest) {
  await initDb();
  const { email } = await req.json();
  const db = getDb();
  const r = await db.execute({ sql: "SELECT id,email,is_active FROM users WHERE email=?", args: [email] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string; email: string; is_active: number };
  if (u.is_active) return NextResponse.json({ ok: false, error: "Already verified. Please login." }, { status: 400 });
  const otp = otp6();
  await db.execute({ sql: "UPDATE users SET otp_code=?, otp_expiry=? WHERE id=?", args: [otp, new Date(Date.now() + 10 * 60000).toISOString(), u.id] });
  try {
    await sendOtpEmail(u.email, otp, "verify");
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Could not send OTP" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
