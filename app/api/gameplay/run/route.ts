import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { BUSINESS_RULES } from "@/lib/config";
import { walletOf } from "@/lib/mlm";

// PRD 3.5 (custom logic): bets are VISUAL ONLY.
// No ROI is credited here. Fixed 1% daily income comes from /api/cron/roi.
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const db = getDb();
  const b = await db.execute({ sql: "SELECT * FROM bots WHERE user_id=? AND status='active' ORDER BY rowid DESC LIMIT 1", args: [u.id as string] });
  if (!b.rows.length) return NextResponse.json({ ok: false, error: "Activate an Aviator Bot first" }, { status: 400 });
  const bot = b.rows[0] as unknown as { id: string; amount: number };
  const today = new Date().toISOString().slice(0, 10);
  const cnt = await db.execute({ sql: "SELECT COUNT(*) as c FROM gameplay WHERE user_id=? AND substr(created_at,1,10)=?", args: [u.id as string, today] });
  const used = Number((cnt.rows[0] as unknown as { c: number }).c);
  if (used >= BUSINESS_RULES.dailyRunLimit)
    return NextResponse.json({ ok: false, error: `Daily limit ${BUSINESS_RULES.dailyRunLimit} bets reached. Profits credit via the daily job.` }, { status: 400 });
  const { bet = 0 } = await req.json().catch(() => ({ bet: 0 }));
  const betAmt = Number(bet) || 0;
  const w = await walletOf(u.id as string);
  const available = Number(w.principal) + Number(w.roi) + Number(w.commission) + Number(w.reward);
  if (betAmt < 0 || betAmt > available) return NextResponse.json({ ok: false, error: "Bet exceeds available balance" }, { status: 400 });
  // Visual round outcome (does NOT move money)
  const mult = Math.round((1 + Math.random() * 4) * 100) / 100;
  const roundNo = used + 1;
  await db.execute({
    sql: "INSERT INTO gameplay (id,user_id,bot_id,round_no,pct,roi_amount,bet_amount) VALUES (?,?,?,?,?,?,?)",
    args: [uid("G"), u.id as string, bot.id, roundNo, mult, 0, betAmt],
  });
  return NextResponse.json({ ok: true, round: roundNo, multiplier: mult, bet: betAmt, visual: true, note: "Demo round. Daily profits credit separately." });
}
