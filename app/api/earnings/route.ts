import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { EARNING_GROUPS } from "@/lib/config";

// GET /api/earnings[?userId=] — per-ID earning summary for today / last-7d / last-30d / all,
// split into roi / level / reward groups (from ledger; game losses net off).
// userId only honored for admins (admin user-detail panel).
export async function GET(req: NextRequest) {
  await initDb();
  const me = await currentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  let uid = me.id as string;
  const q = new URL(req.url).searchParams.get("userId");
  if (q && q !== uid) {
    const { error } = await requireAdmin();
    if (error) return error;
    const chk = await getDb().execute({ sql: "SELECT id FROM users WHERE id=?", args: [q] });
    if (!chk.rows.length) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    uid = q;
  }
  const db = getDb();
  const ranges: Record<string, string> = {
    today: "date(created_at)=date('now')",
    week: "date(created_at)>=date('now','-6 days')",
    month: "date(created_at)>=date('now','-29 days')",
    all: "1=1",
  };
  const out: Record<string, { roi: number; level: number; reward: number; total: number }> = {};
  for (const [name, cond] of Object.entries(ranges)) {
    const g: Record<string, number> = { roi: 0, level: 0, reward: 0 };
    for (const [grp, kinds] of Object.entries(EARNING_GROUPS)) {
      const ph = kinds.map(() => "?").join(",");
      const r = await db.execute({
        sql: `SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind IN (${ph}) AND ${cond}`,
        args: [uid, ...kinds],
      });
      g[grp] = Math.round(Number((r.rows[0] as unknown as { t: number }).t ?? 0) * 100) / 100;
    }
    const total = Math.round((g.roi + g.level + g.reward) * 100) / 100;
    out[name] = { roi: g.roi, level: g.level, reward: g.reward, total };
  }
  const inv = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [uid] });
  return NextResponse.json({ ok: true, userId: uid, ranges: out, invested: Number((inv.rows[0] as unknown as { t: number }).t ?? 0) });
}
