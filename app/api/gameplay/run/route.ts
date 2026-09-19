import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { BUSINESS_RULES, planForAmount } from "@/lib/config";
import { walletOf } from "@/lib/mlm";

// DUMMY Aviator crash game (client rule): pure showpiece.
// - 10 rounds/day, stake min $0.10, max = active bot amount
// - client plays the round locally (plane flies, random crash, optional cash-out)
//   and reports {bet, crashed_at, cashed_at}; server validates ranges only
// - display delta is SHOWN but NEVER credited: no wallet change, no ledger,
//   no level payouts. Real earnings come only from the bot (cron, full tier %).
const CHANCES = 10;
const MIN_STAKE = 0.1;

const round2 = (v: number) => Math.round(v * 100) / 100;

export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if ((u as unknown as { is_blocked: number }).is_blocked)
    return NextResponse.json({ ok: false, error: "Your ID is suspended. Contact admin to unsuspend." }, { status: 403 });
  const userId = u.id as string;
  const db = getDb();
  const b = await db.execute({ sql: "SELECT * FROM bots WHERE user_id=? AND status='active' ORDER BY rowid DESC LIMIT 1", args: [userId] });
  if (!b.rows.length) return NextResponse.json({ ok: false, error: "Start a bot first, then play" }, { status: 400 });
  const bot = b.rows[0] as unknown as { id: string; amount: number; start_date: string };
  const today = new Date().toISOString().slice(0, 10);

  const s = await db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(roi_amount),0) as pnl FROM gameplay WHERE user_id=? AND substr(created_at,1,10)=?", args: [userId, today] });
  const used = Number((s.rows[0] as unknown as { c: number }).c ?? 0);
  if (used >= BUSINESS_RULES.dailyRunLimit)
    return NextResponse.json({ ok: false, error: `Today's 10 rounds are over. Come back tomorrow.` }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const stake = Number(body.bet) || 0;
  const crashed = Number(body.crashed_at) || 0;
  const cashed = body.cashed_at === null || body.cashed_at === undefined ? null : Number(body.cashed_at);
  const stakeCap = round2(Number(bot.amount));
  if (stake < MIN_STAKE) return NextResponse.json({ ok: false, error: `Minimum stake is $${MIN_STAKE}` }, { status: 400 });
  if (stake > stakeCap) return NextResponse.json({ ok: false, error: `Stake exceeds bot amount ($${stakeCap.toFixed(2)})` }, { status: 400 });
  if (!(crashed >= 1)) return NextResponse.json({ ok: false, error: "Bad round" }, { status: 400 });
  if (cashed !== null && (!(cashed >= 1) || cashed > crashed)) return NextResponse.json({ ok: false, error: "Bad cash-out" }, { status: 400 });

  // Display-only result. NOTHING moves: wallet, ledger and levels untouched.
  const delta = cashed !== null ? round2(stake * (cashed - 1)) : round2(-stake);
  const roundNo = used + 1;
  const pct = stake > 0 ? round2((delta / stake) * 100) : 0;
  await db.execute({
    sql: "INSERT INTO gameplay (id,user_id,bot_id,round_no,pct,roi_amount,bet_amount) VALUES (?,?,?,?,?,?,?)",
    args: [uid("G"), userId, bot.id, roundNo, pct, delta, stake],
  });
  const tier = planForAmount(Number(bot.amount));
  const w = await walletOf(userId);
  return NextResponse.json({
    ok: true,
    round: roundNo,
    bet: stake,
    delta,
    outcome: delta > 0 ? "profit" : delta < 0 ? "loss" : "flat",
    chancesLeft: CHANCES - roundNo,
    todayPnl: round2(Number((s.rows[0] as unknown as { pnl: number }).pnl ?? 0) + delta),
    dailyTarget: tier ? round2((Number(bot.amount) * tier.dailyPct) / 100) : 0,
    earningBalance: round2(Number(w.roi) + Number(w.commission) + Number(w.reward)),
    depositBalance: round2(Number(bot.amount)),
    demo: true,
  });
}
