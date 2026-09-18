import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Perf: ALL independent queries go out in ONE db.batch() roundtrip.
// (30 sequential awaits used to cost ~7s cross-region.)
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u || !u.is_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const db = getDb();
  const num = (r: { rows: unknown[] }, k: string) => Number(((r.rows[0] as Record<string, unknown>)?.[k] as number) ?? 0);

  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const S = (sql: string, args: (string | number)[] = []) => ({ sql, args });
  const stmts = [
    S("SELECT COUNT(*) as c FROM users"),
    S("SELECT COUNT(*) as c FROM deposits"),
    S("SELECT COUNT(*) as c FROM withdrawals"),
    S("SELECT COUNT(*) as c FROM bots"),
    S("SELECT COUNT(*) as c FROM bots WHERE status='active'"),
    S("SELECT COUNT(*) as c FROM deposits WHERE status='pending'"),
    S("SELECT id,user_id,net FROM withdrawals WHERE status='pending' ORDER BY rowid DESC LIMIT 20"),
    S("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'"),
    S("SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')"),
    S("SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE kind='daily_roi'"),
    S("SELECT COALESCE(SUM(amount),0) as t FROM commissions"),
    ...days.map((iso) => S("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)=?", [iso])),
    ...days.map((iso) => S("SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved') AND date(created_at)=?", [iso])),
    S("SELECT COUNT(*) as t FROM users WHERE date(created_at)>=date('now','-7 days')"),
    S("SELECT COUNT(*) as t FROM users WHERE date(created_at)>=date('now','-14 days') AND date(created_at)<date('now','-7 days')"),
    S("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)>=date('now','-7 days')"),
    S("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)>=date('now','-14 days') AND date(created_at)<date('now','-7 days')"),
    S("SELECT d.id,d.user_id,d.request_id,d.actual,d.status,d.created_at,u.name,u.email FROM deposits d JOIN users u ON d.user_id=u.id ORDER BY d.rowid DESC LIMIT 6"),
    S("SELECT w.id,w.user_id,w.net,w.status,w.created_at,u.name,u.email FROM withdrawals w JOIN users u ON w.user_id=u.id ORDER BY w.rowid DESC LIMIT 6"),
    S("SELECT d.id,d.user_id,d.request_id,d.requested,d.actual,d.created_at,u.name,u.email FROM deposits d JOIN users u ON d.user_id=u.id WHERE d.status='pending' ORDER BY d.rowid DESC LIMIT 5"),
  ];
  const R = await db.batch(stmts);
  const daily = days.map((iso, i) => ({
    date: iso,
    label: new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    deposits: num(R[11 + i], "t"),
    withdrawals: num(R[18 + i], "t"),
  }));
  const pct = (a: number, b: number) => (b <= 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / b) * 100));

  return NextResponse.json({
    users: num(R[0], "c"),
    deposits: num(R[1], "c"),
    withdrawals: num(R[2], "c"),
    bots: num(R[3], "c"),
    activeBots: num(R[4], "c"),
    pendingDeposits: num(R[5], "c"),
    pendingWithdrawals: R[6].rows,
    pendingDepositsList: R[31].rows,
    totalInvestment: num(R[7], "t"),
    totalWithdrawal: num(R[8], "t"),
    roiPaid: num(R[9], "t"),
    commissionPaid: num(R[10], "t"),
    daily,
    usersTrendPct: pct(num(R[25], "t"), num(R[26], "t")),
    investmentTrendPct: pct(num(R[27], "t"), num(R[28], "t")),
    recentDeposits: R[29].rows,
    recentWithdrawals: R[30].rows,
  });
}
