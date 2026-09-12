import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { createSession } from "@/lib/auth";

// POST { email, otp } -> activates account, creates session
export async function POST(req: NextRequest) {
  await initDb();
  const { email, otp } = await req.json();
  if (!email || !otp) return NextResponse.json({ ok: false, error: "Email + OTP required" }, { status: 400 });
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM users WHERE email=?", args: [email] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string; name: string; otp_code: string; otp_expiry: string; is_active: number };
  if (u.is_active) {
    await createSession(u.id);
    return NextResponse.json({ ok: true, already: true });
  }
  if (!u.otp_code || u.otp_code !== String(otp)) return NextResponse.json({ ok: false, error: "Invalid OTP" }, { status: 400 });
  if (u.otp_expiry && new Date(u.otp_expiry).getTime() < Date.now()) return NextResponse.json({ ok: false, error: "OTP expired. Resend a new one." }, { status: 400 });
  await db.execute({ sql: "UPDATE users SET is_active=1, otp_code='', otp_expiry='' WHERE id=?", args: [u.id] });
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "registration", `${u.name} joined AVIATOR PRO`] });
  await createSession(u.id);
  return NextResponse.json({ ok: true });
}
