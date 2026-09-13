import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

function detailQuery(exp: string, from: string, to: string): { sql: string; args: (string | number)[] } {
  const args: (string | number)[] = [];
  const range = (col: string) => {
    if (from && to) { args.push(from, to); return ` WHERE date(${col})>=? AND date(${col})<=?`; }
    if (from) { args.push(from); return ` WHERE date(${col})>=?`; }
    if (to) { args.push(to); return ` WHERE date(${col})<=?`; }
    return "";
  };
  if (exp === "users") return { sql: `SELECT id,name,mobile,email,referral_code,referred_by,rank,kyc_status,is_active,is_blocked,created_at FROM users${range("created_at")} ORDER BY rowid DESC LIMIT 2000`, args };
  if (exp === "deposits") return { sql: `SELECT d.*, u.name, u.email FROM deposits d JOIN users u ON d.user_id=u.id${range("d.created_at")} ORDER BY d.rowid DESC LIMIT 2000`, args };
  if (exp === "withdrawals") return { sql: `SELECT w.*, u.name, u.email FROM withdrawals w JOIN users u ON w.user_id=u.id${range("w.created_at")} ORDER BY w.rowid DESC LIMIT 2000`, args };
  return { sql: `SELECT * FROM commissions${range("created_at")} ORDER BY rowid DESC LIMIT 2000`, args };
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

  if (exp === "users" || exp === "deposits" || exp === "withdrawals" || exp === "commissions") {
    const { sql, args } = detailQuery(exp, from, to);
    const r = args.length ? await db.execute({ sql, args }) : await db.execute(sql);
    const rows = r.rows as unknown as Record<string, unknown>[];

    if (detail) {
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));
      const start = (page - 1) * limit;
      return NextResponse.json({ ok: true, rows: rows.slice(start, start + limit), total: rows.length, page, limit });
    }

    const head = rows.length ? Object.keys(rows[0]) : [];
    const csv = [head.join(","), ...rows.map((row) => head.map((h) => JSON.stringify(row[h] ?? "")).join(","))].join("\n");
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${exp}.csv` } });
  }

  const q = async (sql: string, args: (string | number | null)[] = []) => Number(((await db.execute({ sql, args })).rows[0] as unknown as Record<string, number>).t ?? 0);
  const users = await db.execute("SELECT COUNT(*) as t FROM users");
  const activeBots = await db.execute("SELECT COUNT(*) as t FROM bots WHERE status='active'");

  const depRange = from && to ? " AND date(created_at)>=? AND date(created_at)<=?" : from ? " AND date(created_at)>=?" : to ? " AND date(created_at)<=?" : "";
  const depArgs = [from, to].filter(Boolean);
  const wdrArgs = [from, to].filter(Boolean);

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
    periodInvestment: from || to ? await q(`SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed'${depRange}`, depArgs) : 0,
    periodWithdrawal: from || to ? await q(`SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE status IN ('pending','approved')${depRange}`, wdrArgs) : 0,
  });
}
