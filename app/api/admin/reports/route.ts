import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const DETAIL_SQL: Record<string, string> = {
  users: "SELECT id,name,mobile,email,referral_code,referred_by,rank,kyc_status,is_active,is_blocked,created_at FROM users ORDER BY rowid DESC LIMIT 2000",
  deposits: "SELECT d.*, u.name, u.email FROM deposits d JOIN users u ON d.user_id=u.id ORDER BY d.rowid DESC LIMIT 2000",
  withdrawals: "SELECT w.*, u.name, u.email FROM withdrawals w JOIN users u ON w.user_id=u.id ORDER BY w.rowid DESC LIMIT 2000",
  commissions: "SELECT * FROM commissions ORDER BY rowid DESC LIMIT 2000",
};

function withDateFilter(sql: string, tableAlias: string, from: string, to: string): string {
  if (!from && !to) return sql;
  const base = sql.split("ORDER BY")[0].trim();
  const orderBy = sql.includes("ORDER BY") ? sql.split("ORDER BY").slice(1).join("ORDER BY") : "";
  let filtered = base;
  if (from && to) filtered += ` WHERE date(${tableAlias}.created_at)>=? AND date(${tableAlias}.created_at)<=?`;
  else if (from) filtered += ` WHERE date(${tableAlias}.created_at)>=?`;
  else if (to) filtered += ` WHERE date(${tableAlias}.created_at)<=?`;
  return `${filtered} ${orderBy}`;
}

export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const db = getDb();
  const url = new URL(req.url);
  const exp = url.searchParams.get("export");
  const detail = url.searchParams.get("detail");
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  if (exp && DETAIL_SQL[exp]) {
    let sql = DETAIL_SQL[exp];
    let args: (string | number)[] = [];
    if (from || to) {
      const alias = exp === "users" ? "" : exp === "commissions" ? "c" : exp === "deposits" ? "d" : "w";
      const prefix = alias ? `${alias}.` : "";
      sql = withDateFilter(sql, alias || exp, from, to);
      if (from && to) args = [from, to];
      else if (from) args = [from];
      else if (to) args = [to];
    }
    const r = args.length ? await db.execute({ sql, args }) : await db.execute(sql);
    const rows = r.rows as unknown as Record<string, unknown>[];

    if (detail) {
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
      const start = (page - 1) * limit;
      const paginated = rows.slice(start, start + limit);
      return NextResponse.json({ ok: true, rows: paginated, total: rows.length, page, limit });
    }

    const head = rows.length ? Object.keys(rows[0]) : [];
    const csv = [head.join(","), ...rows.map((row) => head.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${exp}.csv` } });
  }

  const q = async (sql: string, args: (string | number | null)[] = []) => Number(((await db.execute({ sql, args })).rows[0] as unknown as Record<string, number>).t ?? 0);
  const users = await db.execute("SELECT COUNT(*) as t FROM users");
  const activeBots = await db.execute("SELECT COUNT(*) as t FROM bots WHERE status='active'");

  const dateDepositFilter = from && to ? " AND date(created_at)>=? AND date(created_at)<=?" : from ? " AND date(created_at)>=?" : to ? " AND date(created_at)<=?" : "";
  const dateWithdrawFilter = from && to ? " AND date(created_at)>=? AND date(created_at)<=?" : from ? " AND date(created_at)>=?" : to ? " AND date(created_at)<=?" : "";
  const depositArgs: (string | number)[] = [from, to].filter(Boolean) as (string | number)[];
  const withdrawArgs: (string | number)[] = [from, to].filter(Boolean) as (string | number)[];

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
    periodInvestment: from || to ? await q(`SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'${dateDepositFilter}`, depositArgs) : 0,
    periodWithdrawal: from || to ? await q(`SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')${dateWithdrawFilter}`, withdrawArgs) : 0,
  });
}
