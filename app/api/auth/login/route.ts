import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, withTimeout } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";

// Every DB call is time-bounded: a stuck socket answers 503 (retry) instead
// of hanging to maxDuration, so login never sticks on "please wait".
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Always JSON (never an HTML 500): a hiccup must read as "retry", not "broken".
  try {
    await withTimeout(initDb());
    let body: { email?: string; password?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
    }
    const { email, password } = body;
    if (!email || !password)
      return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
  const settings = await withTimeout(getSettings());
  const db = getDb();
  const r = await withTimeout(db.execute({ sql: "SELECT * FROM users WHERE email=? OR mobile=?", args: [email, email] }));
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  const u = r.rows[0] as unknown as { id: string; password_hash: string; is_active: number; is_blocked: number; is_admin: number };
  if (u.is_blocked) return NextResponse.json({ ok: false, error: "Your ID is suspended. Contact admin to unsuspend." }, { status: 403 });
  if (!u.is_active) return NextResponse.json({ ok: false, error: "Account not verified. Please verify email OTP first.", needOtp: true }, { status: 403 });
  if (settings.maintenanceMode === "on" && !u.is_admin) return NextResponse.json({ ok: false, error: "Platform under maintenance. Try later." }, { status: 503 });
  if (!(await verifyPassword(password, u.password_hash))) return NextResponse.json({ ok: false, error: "Wrong password" }, { status: 401 });
  await createSession(u.id, req.headers.get("host"));
  // Activation gate: dashboard unlocks only after admin confirms first deposit (or active bot).
  let needsActivation = false;
  if (!u.is_admin) {
    const conf = await withTimeout(db.execute({ sql: "SELECT id FROM deposits WHERE user_id=? AND status='confirmed' LIMIT 1", args: [u.id] }));
    if (!conf.rows.length) {
      const bot = await withTimeout(db.execute({ sql: "SELECT id FROM bots WHERE user_id=? AND status='active' LIMIT 1", args: [u.id] }));
      needsActivation = bot.rows.length === 0;
    }
  }
  return NextResponse.json({ ok: true, is_admin: !!u.is_admin, userId: u.id, needsActivation, sess: 2 });
  } catch {
    return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  }
}
