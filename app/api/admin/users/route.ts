import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { logLedger } from "@/lib/mlm";

// GET ?q=search (name/email/mobile/referral)
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  const base = "SELECT u.*, COALESCE((SELECT SUM(actual) FROM deposits WHERE user_id=u.id AND status='confirmed'),0) as invested, (SELECT principal+roi+commission+reward FROM wallets WHERE user_id=u.id) as balance FROM users u";
  const r = q
    ? await getDb().execute({ sql: `${base} WHERE u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ? ORDER BY u.rowid DESC LIMIT 50`, args: [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`] })
    : await getDb().execute(`${base} ORDER BY u.rowid DESC LIMIT 50`);
  return NextResponse.json({ ok: true, rows: r.rows });
}

// POST { userId, action: block|unblock|kyc|credit|debit|sponsor|password, ... }
export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { userId, action, amount, wallet, status, sponsor, password, remark } = await req.json();
  const db = getDb();
  if (action === "block") await db.execute({ sql: "UPDATE users SET is_blocked=1 WHERE id=?", args: [userId] });
  else if (action === "unblock") await db.execute({ sql: "UPDATE users SET is_blocked=0 WHERE id=?", args: [userId] });
  else if (action === "kyc") {
    if (!["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ ok: false, error: "Bad status" }, { status: 400 });
    await db.execute({ sql: "UPDATE users SET kyc_status=? WHERE id=?", args: [status, userId] });
  } else if (action === "credit" || action === "debit") {
    const amt = Number(amount);
    if (!amt || amt <= 0) return NextResponse.json({ ok: false, error: "Bad amount" }, { status: 400 });
    const w = ["principal", "roi", "commission", "reward"].includes(wallet) ? wallet : "principal";
    const delta = action === "credit" ? amt : -amt;
    await db.execute({ sql: `UPDATE wallets SET ${w}=${w}+? WHERE user_id=?`, args: [delta, userId] });
    await logLedger(userId, `admin_${action}`, w, delta, remark || "");
  } else if (action === "sponsor") {
    const s = await db.execute({ sql: "SELECT referral_code FROM users WHERE referral_code=?", args: [sponsor] });
    if (!s.rows.length) return NextResponse.json({ ok: false, error: "Sponsor not found" }, { status: 400 });
    await db.execute({ sql: "UPDATE users SET referred_by=? WHERE id=?", args: [sponsor, userId] });
  } else if (action === "password") {
    if (!password || password.length < 6) return NextResponse.json({ ok: false, error: "Min 6 chars" }, { status: 400 });
    await db.execute({ sql: "UPDATE users SET password_hash=? WHERE id=?", args: [await hashPassword(password), userId] });
  } else return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "registration", `Admin: ${action} on ${userId}`] });
  return NextResponse.json({ ok: true, action });
}
