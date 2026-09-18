import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const db = getDb();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 25)));
  const offset = (page - 1) * limit;
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  const statusFilter = new URL(req.url).searchParams.get("status") || "";

  let where = "1=1";
  const args: (string | number)[] = [];
  if (statusFilter) { where += " AND u.kyc_status=?"; args.push(statusFilter); }
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM users u WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT u.*, COALESCE((SELECT SUM(actual) FROM deposits WHERE user_id=u.id AND status='confirmed'),0) as invested, (SELECT principal+roi+commission+reward FROM wallets WHERE user_id=u.id) as balance FROM users u WHERE ${where} ORDER BY u.rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  // Never leak secrets to the admin UI
  const safe = (rows as unknown as { rows: Record<string, unknown>[] }).rows.map((r) => {
    const { password_hash, otp_code, otp_expiry, reset_code, reset_expiry, ...rest } = r;
    return rest;
  });
  return NextResponse.json({ ok: true, rows: safe, total, page, limit });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { userId, action, amount, wallet, status: kycStatus, sponsor, password, remark } = await req.json();
  const db = getDb();
  const target = userId ? await db.execute({ sql: "SELECT id,is_admin FROM users WHERE id=?", args: [userId] }) : null;
  const targetRow = target?.rows[0] as unknown as { id: string; is_admin: number } | undefined;
  if ((action === "block" || action === "unblock" || action === "delete" || action === "password") && !targetRow)
    return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  if ((action === "block" || action === "delete") && targetRow?.is_admin)
    return NextResponse.json({ ok: false, error: "Admin accounts cannot be blocked or removed" }, { status: 400 });
  if (action === "block") await db.execute({ sql: "UPDATE users SET is_blocked=1 WHERE id=?", args: [userId] });
  else if (action === "unblock") await db.execute({ sql: "UPDATE users SET is_blocked=0 WHERE id=?", args: [userId] });
  else if (action === "delete") {
    await db.execute({ sql: "DELETE FROM commissions WHERE from_user=? OR to_user=?", args: [userId, userId] });
    for (const t of ["ledger", "deposits", "withdrawals", "bots", "support_tickets", "campaign_achievers", "wallets", "gameplay", "reward_claims"]) {
      await db.execute({ sql: `DELETE FROM ${t} WHERE user_id=?`, args: [userId] });
    }
    await db.execute({ sql: "DELETE FROM users WHERE id=?", args: [userId] });
  }
  else if (action === "kyc") {
    if (!["pending", "approved", "rejected"].includes(kycStatus)) return NextResponse.json({ ok: false, error: "Bad status" }, { status: 400 });
    await db.execute({ sql: "UPDATE users SET kyc_status=? WHERE id=?", args: [kycStatus, userId] });
  } else if (action === "credit" || action === "debit") {
    const amt = Number(amount);
    if (!amt || amt <= 0) return NextResponse.json({ ok: false, error: "Bad amount" }, { status: 400 });
    const w = ["principal", "roi", "commission", "reward"].includes(wallet) ? wallet : "principal";
    const delta = action === "credit" ? amt : -amt;
    await db.execute({ sql: `UPDATE wallets SET ${w}=${w}+? WHERE user_id=?`, args: [delta, userId] });
    const { uid } = await import("@/lib/db");
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "admin_action", `Admin ${action} ${amt} ${w} for ${userId}`] });
  } else if (action === "sponsor") {
    const s = await db.execute({ sql: "SELECT referral_code FROM users WHERE referral_code=?", args: [sponsor] });
    if (!s.rows.length) return NextResponse.json({ ok: false, error: "Sponsor not found" }, { status: 400 });
    await db.execute({ sql: "UPDATE users SET referred_by=? WHERE id=?", args: [sponsor, userId] });
  } else if (action === "password") {
    if (!password || password.length < 6) return NextResponse.json({ ok: false, error: "Min 6 chars" }, { status: 400 });
    const { hashPassword } = await import("@/lib/auth");
    await db.execute({ sql: "UPDATE users SET password_hash=? WHERE id=?", args: [await hashPassword(password), userId] });
  } else return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  return NextResponse.json({ ok: true, action });
}
