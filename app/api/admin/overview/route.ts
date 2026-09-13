import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u || !u.is_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const db = getDb();
  const num = (r: { rows: unknown[] }, k: string) => Number(((r.rows[0] as Record<string, unknown>)?.[k] as number) ?? 0);

  const users = await db.execute("SELECT COUNT(*) as c FROM users");
  const deps = await db.execute("SELECT COUNT(*) as c FROM deposits");
  const wds = await db.execute("SELECT COUNT(*) as c FROM withdrawals");
  const bots = await db.execute("SELECT COUNT(*) as c FROM bots");
  const activeBots = await db.execute("SELECT COUNT(*) as c FROM bots WHERE status='active'");
  const pendDeps = await db.execute("SELECT COUNT(*) as c FROM deposits WHERE status='pending'");
  const pendWds = await db.execute("SELECT id,user_id,net FROM withdrawals WHERE status='pending' ORDER BY rowid DESC LIMIT 20");
  const totalInv = await db.execute("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'");
  const totalWdr = await db.execute("SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')");
  const roiPaid = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE kind='daily_roi'");
  const commPaid = await db.execute("SELECT COALESCE(SUM(amount),0) as t FROM commissions");

  // Daily series for last 7 days (real data)
  const daily: { date: string; label: string; deposits: number; withdrawals: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dep = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)=?", args: [iso] });
    const wdr = await db.execute({ sql: "SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved') AND date(created_at)=?", args: [iso] });
    daily.push({
      date: iso,
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposits: num(dep, "t"),
      withdrawals: num(wdr, "t"),
    });
  }

  // Trend deltas: last 7 days vs previous 7 days
  const usersNow = await db.execute("SELECT COUNT(*) as t FROM users WHERE date(created_at)>=date('now','-7 days')");
  const usersPrev = await db.execute("SELECT COUNT(*) as t FROM users WHERE date(created_at)>=date('now','-14 days') AND date(created_at)<date('now','-7 days')");
  const invNow = await db.execute("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)>=date('now','-7 days')");
  const invPrev = await db.execute("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)>=date('now','-14 days') AND date(created_at)<date('now','-7 days')");
  const pct = (a: number, b: number) => (b <= 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  const recentDeps = await db.execute("SELECT d.id,d.user_id,d.request_id,d.actual,d.status,d.created_at,u.name,u.email FROM deposits d JOIN users u ON d.user_id=u.id ORDER BY d.rowid DESC LIMIT 6");
  const recentWds = await db.execute("SELECT w.id,w.user_id,w.net,w.status,w.created_at,u.name,u.email FROM withdrawals w JOIN users u ON w.user_id=u.id ORDER BY w.rowid DESC LIMIT 6");
  const pendingDepsList = await db.execute("SELECT d.id,d.user_id,d.request_id,d.requested,d.actual,d.created_at,u.name,u.email FROM deposits d JOIN users u ON d.user_id=u.id WHERE d.status='pending' ORDER BY d.rowid DESC LIMIT 5");

  return NextResponse.json({
    users: num(users, "c"),
    deposits: num(deps, "c"),
    withdrawals: num(wds, "c"),
    bots: num(bots, "c"),
    activeBots: num(activeBots, "c"),
    pendingDeposits: num(pendDeps, "c"),
    pendingWithdrawals: pendWds.rows,
    pendingDepositsList: pendingDepsList.rows,
    totalInvestment: num(totalInv, "t"),
    totalWithdrawal: num(totalWdr, "t"),
    roiPaid: num(roiPaid, "t"),
    commissionPaid: num(commPaid, "t"),
    daily,
    usersTrendPct: pct(num(usersNow, "t"), num(usersPrev, "t")),
    investmentTrendPct: pct(num(invNow, "t"), num(invPrev, "t")),
    recentDeposits: recentDeps.rows,
    recentWithdrawals: recentWds.rows,
  });
}
