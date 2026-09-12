import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await initDb();
  const { email, password } = await req.json();
  const settings = await getSettings();
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM users WHERE email=? OR mobile=?", args: [email, email] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string; password_hash: string; is_active: number; is_blocked: number; is_admin: number };
  if (u.is_blocked) return NextResponse.json({ ok: false, error: "Account blocked. Contact support." }, { status: 403 });
  if (!u.is_active) return NextResponse.json({ ok: false, error: "Account not verified. Please verify email OTP first.", needOtp: true }, { status: 403 });
  if (settings.maintenanceMode === "on" && !u.is_admin) return NextResponse.json({ ok: false, error: "Platform under maintenance. Try later." }, { status: 503 });
  if (!(await verifyPassword(password, u.password_hash))) return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  await createSession(u.id);
  return NextResponse.json({ ok: true });
}
