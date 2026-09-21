import { NextResponse } from "next/server";
import { currentUser, sessionStatus } from "@/lib/auth";
import { getDb, initDb } from "@/lib/db";
import { cappedExtras, teamCounts, walletOf } from "@/lib/mlm";
import { BOT_PLANS, planForAmount } from "@/lib/config";

// PRD 3.2 dashboard: wallets, active bot, today's earnings, totals, team stats, recent tx
export async function GET() {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const uid = u.id as string;
  const w = await walletOf(uid);
  const db = getDb();
  const b = await db.execute({ sql: "SELECT * FROM bots WHERE user_id=? AND status='active' ORDER BY rowid DESC LIMIT 1", args: [uid] });
  const ball = await db.execute({ sql: "SELECT id,plan,amount,daily_pct,total_earned,expiry_date,start_date,status FROM bots WHERE user_id=? AND status IN ('active','capped') ORDER BY rowid DESC", args: [uid] });
  // Capping meter: cap = amount x tier multiplier; used = direct ROI + rewards
  // (level/direct never count). Left = room before ALL incomes stop.
  const capBots = [];
  for (const r of ball.rows as unknown as { id: string; plan: string; amount: number; daily_pct: number; total_earned: number; expiry_date: string; start_date: string; status: string }[]) {
    const amt = Number(r.amount);
    const tier = BOT_PLANS.find((p) => p.name === r.plan) || planForAmount(amt);
    const mult = tier ? tier.multiplier : 2;
    const cap = amt * mult;
    const used = Number(r.total_earned ?? 0) + (await cappedExtras(uid, (r.start_date || "").slice(0, 10) || "1970-01-01"));
    capBots.push({ ...r, cap: Math.round(cap * 100) / 100, capUsed: Math.round(used * 100) / 100, capLeft: Math.max(0, Math.round((cap - used) * 100) / 100) });
  }
  const bots = await db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as t FROM bots WHERE user_id=? AND status='active'", args: [uid] });
  const inv = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [uid] });
  const wd = await db.execute({ sql: "SELECT COALESCE(SUM(net),0) as t FROM withdrawals WHERE user_id=? AND status IN ('pending','approved')", args: [uid] });
  const today = new Date().toISOString().slice(0, 10);
  const earn = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind IN ('daily_roi','roi_level','first_recharge','reward','game_profit','game_loss') AND substr(created_at,1,10)=?", args: [uid, today] });
  const counts = await teamCounts(uid);
  const tx = await db.execute({ sql: "SELECT kind,wallet,amount,note,created_at FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 8", args: [uid] });
  // User panels never show money broadcasts: no deposit/ROI/withdrawal lines
  // of other members (e.g. "Deposit confirmed…", "X requested withdrawal…",
  // "Daily ROI distributed…"). Only joins/campaign notices pass through.
  const acts = await db.execute({ sql: "SELECT kind,message,created_at FROM activities WHERE kind NOT IN ('investment','withdrawal') AND message NOT LIKE 'Daily ROI distributed%' ORDER BY rowid DESC LIMIT 8", args: [] });
  const active = (b.rows[0] ?? null) as unknown;
  const bAgg = bots.rows[0] as unknown as { c: number; t: number };
  const total = Number(w.principal) + Number(w.roi) + Number(w.commission) + Number(w.reward);
  return NextResponse.json({
    ok: true,
    user: u,
    wallet: w,
    available: total,
    activeBot: active,
    bots: capBots,
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
