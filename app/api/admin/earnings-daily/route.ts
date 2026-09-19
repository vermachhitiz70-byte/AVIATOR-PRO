import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { EARNING_GROUPS } from "@/lib/config";

// GET /api/admin/earnings-daily?userId=&days=30 — per-day earning series
// (newest first) for the admin Earnings page chart + day table. Admin only.
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const userId = new URL(req.url).searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get("days") || 30)));
  const db = getDb();
  const chk = await db.execute({ sql: "SELECT id,name,referral_code FROM users WHERE id=?", args: [userId] });
  if (!chk.rows.length) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  const cutoff = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const groups = Object.entries(EARNING_GROUPS);
  const perDay = new Map<string, { date: string; roi: number; level: number; reward: number; total: number }>();
  for (const [grp, kinds] of groups) {
    const ph = kinds.map(() => "?").join(",");
    const r = await db.execute({
      sql: `SELECT substr(created_at,1,10) as d, COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind IN (${ph}) AND date(created_at)>=? GROUP BY d ORDER BY d DESC`,
      args: [userId, ...kinds, cutoff],
    });
    for (const row of r.rows as unknown as { d: string; t: number }[]) {
      const d = String(row.d);
      if (!perDay.has(d)) perDay.set(d, { date: d, roi: 0, level: 0, reward: 0, total: 0 });
      const e = perDay.get(d)!;
      (e as unknown as Record<string, number>)[grp] = Math.round(Number(row.t) * 100) / 100;
    }
  }
  const rows = [...perDay.values()].map((e) => ({ ...e, total: Math.round((e.roi + e.level + e.reward) * 100) / 100 }));
  const u = chk.rows[0] as unknown as { name: string; referral_code: string };
  return NextResponse.json({ ok: true, user: { id: userId, name: u.name, referral_code: u.referral_code }, days: rows });
}
