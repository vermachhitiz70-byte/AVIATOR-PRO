import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET -> totals. GET ?export=deposits|withdrawals|commissions|users -> CSV download
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const db = getDb();
  const exp = new URL(req.url).searchParams.get("export");
  if (exp === "deposits" || exp === "withdrawals" || exp === "commissions" || exp === "users") {
    const tables: Record<string, string> = {
      deposits: "SELECT * FROM deposits ORDER BY rowid DESC LIMIT 2000",
      withdrawals: "SELECT * FROM withdrawals ORDER BY rowid DESC LIMIT 2000",
      commissions: "SELECT * FROM commissions ORDER BY rowid DESC LIMIT 2000",
      users: "SELECT id,name,mobile,email,referral_code,referred_by,rank,kyc_status,is_active,is_blocked,created_at FROM users ORDER BY rowid DESC LIMIT 2000",
    };
    const r = await db.execute(tables[exp]);
    const rows = r.rows as unknown as Record<string, unknown>[];
    const head = rows.length ? Object.keys(rows[0]) : [];
    const csv = [head.join(","), ...rows.map((row) => head.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${exp}.csv` } });
  }
  const q = async (sql: string, args: (string | number | null)[] = []) => Number(((await db.execute({ sql, args })).rows[0] as unknown as Record<string, number>).t ?? 0);
  const users = await db.execute("SELECT COUNT(*) as t FROM users");
  const activeBots = await db.execute("SELECT COUNT(*) as t FROM bots WHERE status='active'");
  return NextResponse.json({
    ok: true,
    users: Number((users.rows[0] as unknown as { t: number }).t),
    activeBots: Number((activeBots.rows[0] as unknown as { t: number }).t),
    totalInvestment: await q("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'"),
    totalWithdrawal: await q("SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')"),
    roiPaid: await q("SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE kind='daily_roi'"),
    commissionPaid: await q("SELECT COALESCE(SUM(amount),0) as t FROM commissions"),
    pendingDeposits: await q("SELECT COUNT(*) as t FROM deposits WHERE status='pending'"),
    pendingWithdrawals: await q("SELECT COUNT(*) as t FROM withdrawals WHERE status='pending'"),
    todayUsers: await q("SELECT COUNT(*) as t FROM users WHERE date(created_at)=date('now')"),
    todayInvestment: await q("SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' AND date(created_at)=date('now')"),
  });
}
