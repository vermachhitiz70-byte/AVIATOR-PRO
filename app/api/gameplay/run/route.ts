import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { BUSINESS_RULES, planForAmount } from "@/lib/config";
import { cappedExtras, creditRoiLevels, logLedger, walletOf } from "@/lib/mlm";

// Crypto trading game (client spec).
// - 10 chances per user per day, stake from DEPOSIT (Principal) wallet only
// - min stake $0.10, max stake = deposit balance
// - each trade settles instantly to the ROI wallet and is shown as profit OR loss
// - DAILY MODEL: the day's target is the bot's tier % (e.g. $10 Starter = $0.30).
//   Game earns part of it live during the day; the 5 AM cron credits only the
//   REMAINDER (target minus game-earned minus already-cron-paid). Never exposed:
//   mixed wins/losses disguise it; the last remaining chance absorbs the remainder.
//   Overshoots are clamped so the day total never exceeds the tier target.
const CHANCES = 10;
const MIN_STAKE = 0.1;
const MAX_DELTA = 10;

const round2 = (v: number) => Math.round(v * 100) / 100;

export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const userId = u.id as string;
  const db = getDb();
  const b = await db.execute({ sql: "SELECT * FROM bots WHERE user_id=? AND status='active' ORDER BY rowid DESC LIMIT 1", args: [userId] });
  if (!b.rows.length) return NextResponse.json({ ok: false, error: "Activate a trading bot first" }, { status: 400 });
  const bot = b.rows[0] as unknown as { id: string; amount: number; start_date: string };
  const today = new Date().toISOString().slice(0, 10);

  const s = await db.execute({ sql: "SELECT COALESCE(SUM(roi_amount),0) as pnl, COUNT(*) as c FROM gameplay WHERE user_id=? AND substr(created_at,1,10)=?", args: [userId, today] });
  const settled = round2(Number((s.rows[0] as unknown as { pnl: number }).pnl ?? 0));
  const used = Number((s.rows[0] as unknown as { c: number }).c ?? 0);
  if (used >= BUSINESS_RULES.dailyRunLimit)
    return NextResponse.json({ ok: false, error: `Today's 10 trades are over. Come back tomorrow.` }, { status: 400 });

  const { bet = 0 } = await req.json().catch(() => ({ bet: 0 }));
  const stake = Number(bet) || 0;
  const w = await walletOf(userId);
  // Stake is display-only (never leaves the wallet — only the settled P&L moves,
  // into the ROI wallet). Cap it at the DEPOSIT (Principal) balance only —
  // earning wallets (ROI/Commission/Reward) do not count; min $0.10.
  const stakeCap = round2(Number(w.principal));
  if (stake < MIN_STAKE) return NextResponse.json({ ok: false, error: `Minimum trade is $${MIN_STAKE}` }, { status: 400 });
  if (stake > stakeCap) return NextResponse.json({ ok: false, error: `Stake exceeds deposit balance ($${stakeCap.toFixed(2)})` }, { status: 400 });

  // Daily target = this bot's tier % for today, minus anything already
  // credited (live game earnings so far + any cron ROI already paid today).
  // Game earns part of it live; the 5 AM cron credits only the remainder.
  const tier = planForAmount(Number(bot.amount));
  if (!tier) return NextResponse.json({ ok: false, error: "Bot amount outside all tiers" }, { status: 400 });
  const dayTarget = round2((Number(bot.amount) * tier.dailyPct) / 100);
  const cronPaid = await db.execute({ sql: "SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind='daily_roi' AND substr(created_at,1,10)=?", args: [userId, today] });
  const target = round2(Math.max(0, dayTarget - Number((cronPaid.rows[0] as unknown as { t: number }).t ?? 0)));
  // Package cap counts ROI + Rewards + Game: no game earnings once capped
  const bfull = await db.execute({ sql: "SELECT total_earned FROM bots WHERE id=?", args: [bot.id] });
  const earned = Number((bfull.rows[0] as unknown as { total_earned: number }).total_earned ?? 0);
  const room = tier.multiplier * Number(bot.amount) - earned - (await cappedExtras(userId, (bot.start_date || today).slice(0, 10)));
  if (room <= 0) return NextResponse.json({ ok: false, error: "Bot earnings capped — no further game profit." }, { status: 400 });
  const left = CHANCES - used;
  const remaining = round2(target - settled);
  let delta: number;
  if (target <= 0 || remaining <= 0) {
    delta = 0;
  } else if (left <= 1) {
    delta = remaining;
  } else {
    const avg = remaining / left;
    const spread = Math.min(2, Math.max(0.05, Math.abs(avg) * 2));
    delta = round2(avg + (Math.random() * 2 - 1) * spread);
    delta = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, delta));
    if (delta > 0 && round2(settled + delta) > target) delta = round2(target - settled);
  }

  await db.execute({ sql: "UPDATE wallets SET roi=roi+? WHERE user_id=?", args: [delta, userId] });
  await logLedger(userId, delta >= 0 ? "game_profit" : "game_loss", "roi", delta, `trade stake ${stake.toFixed(2)}`);
  // Level income flows live on the profitable part, same rates as cron ROI.
  if (delta > 0) {
    try { await creditRoiLevels(userId, delta); } catch { /* levels optional */ }
  }
  const roundNo = used + 1;
  const pct = stake > 0 ? round2((delta / stake) * 100) : 0;
  await db.execute({
    sql: "INSERT INTO gameplay (id,user_id,bot_id,round_no,pct,roi_amount,bet_amount) VALUES (?,?,?,?,?,?,?)",
    args: [uid("G"), userId, bot.id, roundNo, pct, delta, stake],
  });
  const w2 = await walletOf(userId);
  const newEarning = round2(Number(w2.roi) + Number(w2.commission) + Number(w2.reward));
  const newDeposit = round2(Number(w2.principal));
  return NextResponse.json({
    ok: true,
    round: roundNo,
    bet: stake,
    delta,
    outcome: delta > 0 ? "profit" : delta < 0 ? "loss" : "flat",
    chancesLeft: left - 1,
    todayPnl: round2(settled + delta),
    dailyTarget: target,
    earningBalance: newEarning,
    depositBalance: newDeposit,
  });
}
