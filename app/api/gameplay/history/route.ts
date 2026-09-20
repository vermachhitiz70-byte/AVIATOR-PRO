import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { walletOf } from "@/lib/mlm";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const today = new Date().toISOString().slice(0, 10);
  const db = getDb();
  const t = await db.execute({ sql: "SELECT round_no,bet_amount,roi_amount,pct,created_at FROM gameplay WHERE user_id=? AND substr(created_at,1,10)=? ORDER BY round_no DESC", args: [u.id as string, today] });
  const c = await db.execute({ sql: "SELECT COUNT(*) as c, COALESCE(SUM(roi_amount),0) as pnl FROM gameplay WHERE user_id=? AND substr(created_at,1,10)=?", args: [u.id as string, today] });
  const w = await walletOf(u.id as string);
  const earning = Math.round((Number(w.roi) + Number(w.commission) + Number(w.reward)) * 100) / 100;
  // Playable balance: total bot amount if bots exist, else deposit (principal).
  // No bot needed for the dummy game — deposit alone unlocks the 10 chances.
  const b = await db.execute({ sql: "SELECT amount,daily_pct FROM bots WHERE user_id=? AND status='active'", args: [u.id as string] });
  const bots = b.rows as unknown as { amount: number; daily_pct: number }[];
  const amt = bots.reduce((n, x) => n + Number(x.amount), 0);
  const deposit = b.rows.length ? amt : Math.round(Number(w.principal) * 100) / 100;
  const dailyTarget = Math.round(bots.reduce((n, x) => n + (Number(x.amount) * Number(x.daily_pct)) / 100, 0) * 100) / 100;
  return NextResponse.json({
    ok: true,
    today: t.rows,
    used: Number((c.rows[0] as unknown as { c: number }).c),
    limit: 10,
    todayPnl: Math.round(Number((c.rows[0] as unknown as { pnl: number }).pnl ?? 0) * 100) / 100,
    dailyTarget,
    earningBalance: earning,
    depositBalance: deposit,
  });
}
