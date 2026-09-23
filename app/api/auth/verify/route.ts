import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { registerProof, sendProof } from "@/lib/telegram";

// POST { email, otp } -> activates account, emails fresh login credentials, creates session
export async function POST(req: NextRequest) {
  await initDb();
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ ok: false, error: "Email + OTP required" }, { status: 400 });
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM users WHERE email=?", args: [email] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string; name: string; otp_code: string; otp_expiry: string; is_active: number };
  if (u.is_active) {
    await createSession(u.id, req.headers.get("host"));
    return NextResponse.json({ ok: true, already: true });
  }
  if (!u.otp_code || u.otp_code !== String(otp)) return NextResponse.json({ ok: false, error: "Invalid OTP" }, { status: 400 });
  if (u.otp_expiry && new Date(u.otp_expiry).getTime() < Date.now()) return NextResponse.json({ ok: false, error: "OTP expired. Resend a new one." }, { status: 400 });
  // Client rule: on final registration, issue a fresh password and email the credentials.
  // Activation never fails because of mail — SMTP errors are logged as an activity instead.
  const tempPassword = `Av${Math.floor(100000 + Math.random() * 900000)}!`;
  await db.execute({ sql: "UPDATE users SET is_active=1, otp_code='', otp_expiry='', password_hash=? WHERE id=?", args: [await hashPassword(tempPassword), u.id] });
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "registration", `${u.name} joined AVIATOR SMART AI`] });
  try {
    const { sendCredentialsEmail } = await import("@/lib/mail");
    await sendCredentialsEmail(email, u.name, email, tempPassword);
  } catch {
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "registration", `Credentials email skipped (SMTP not configured) for ${email}`] });
  }
  await createSession(u.id, req.headers.get("host"));
  // Live proof channel for fresh activations only (re-verifies stay silent).
  const proofSent = await sendProof(registerProof({
    name: String((u as unknown as { name: string }).name || "Member"),
    code: String((u as unknown as { referral_code: string }).referral_code || ""),
    email: String(email),
  }));
  if (!proofSent) console.warn("telegram register proof not sent");
  return NextResponse.json({ ok: true, needsActivation: true });
}
