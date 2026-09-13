import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u || !u.is_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const db = getDb();
  const users = await db.execute("SELECT COUNT(*) as c FROM users");
  const deps = await db.execute("SELECT COUNT(*) as c FROM deposits");
  const wds = await db.execute("SELECT COUNT(*) as c FROM withdrawals");
  const bots = await db.execute("SELECT COUNT(*) as c FROM bots");
  const pendDeps = await db.execute("SELECT COUNT(*) as c FROM deposits WHERE status='pending'");
  const pendWds = await db.execute("SELECT id,user_id,net FROM withdrawals WHERE status='pending' ORDER BY rowid DESC LIMIT 20");
  const totalInv = await db.execute("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'");
  const totalWdr = await db.execute("SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')");
  const roiPaid = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE kind='daily_roi'");
  const commPaid = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM commissions");
  return NextResponse.json({
    users: (users.rows[0] as unknown as { c: number }).c,
    deposits: (deps.rows[0] as unknown as { c: number }).c,
    withdrawals: (wds.rows[0] as unknown as { c: number }).c,
    bots: (bots.rows[0] as unknown as { c: number }).c,
    pendingDeposits: (pendDeps.rows[0] as unknown as { c: number }).c,
    pendingWithdrawals: pendWds.rows,
    totalInvestment: (totalInv.rows[0] as unknown as { t: number }).t,
    totalWithdrawal: (totalWdr.rows[0] as unknown as { t: number }).t,
    roiPaid: (roiPaid.rows[0] as unknown as { t: number }).t,
    commissionPaid: (commPaid.rows[0] as unknown as { t: number }).t,
  });
}
