import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";
import { teamCounts, walletOf } from "@/lib/mlm";

// PRD 3.2 dashboard: wallets, active bot, today's earnings, totals, team stats, recent tx
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const uid = u.id as string;
  const w = await walletOf(uid);
  const db = getDb();
  const b = await db.execute({ sql: "SELECT * FROM bots WHERE user_id=? AND status='active' ORDER BY rowid DESC LIMIT 1", args: [uid] });
  const bots = await db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as t FROM bots WHERE user_id=? AND status='active'", args: [uid] });
  const inv = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [uid] });
  const wd = await db.execute({ sql: "SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE user_id=? AND status IN ('pending','approved')", args: [uid] });
  const today = new Date().toISOString().slice(0, 10);
  const earn = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind IN ('daily_roi','roi_level','first_recharge','reward') AND substr(created_at,1,10)=?", args: [uid, today] });
  const counts = await teamCounts(uid);
  const tx = await db.execute({ sql: "SELECT kind,wallet,amount,note,created_at FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 8", args: [uid] });
  const acts = await db.execute({ sql: "SELECT kind,message,created_at FROM activities ORDER BY rowid DESC LIMIT 8", args: [] });
  const active = (b.rows[0] ?? null) as unknown;
  const bAgg = bots.rows[0] as unknown as { c: number; t: number };
  const total = Number(w.principal) + Number(w.roi) + Number(w.commission) + Number(w.reward);
  return NextResponse.json({
    ok: true,
    user: u,
    wallet: w,
    available: total,
    activeBot: active,
    activeBots: Number(bAgg.c),
    activeInvestment: Number(bAgg.t),
    totalInvestment: Number((inv.rows[0] as unknown as { t: number }).t),
    totalWithdrawal: Number((wd.rows[0] as unknown as { t: number }).t),
    todayEarnings: Number((earn.rows[0] as unknown as { t: number }).t),
    direct: counts.direct,
    teamTotal: counts.total,
    recentTx: tx.rows,
    feed: acts.rows,
  });
}
