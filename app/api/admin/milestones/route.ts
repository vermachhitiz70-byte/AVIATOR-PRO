import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { MILESTONES } from "@/lib/config";

// GET /api/admin/milestones — every member's reward status in a few queries:
// self/direct business, full-subtree team business (recursive CTE), directs &
// team counts, claimed tiers; per-tier ready[] computed server-side. Admin only.
export async function GET() {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const db = getDb();
  const users = await db.execute({ sql: "SELECT id,name,email,mobile,referral_code FROM users ORDER BY rowid DESC LIMIT 500", args: [] });
  const list = users.rows as unknown as { id: string; name: string; email: string; mobile: string; referral_code: string }[];
  if (!list.length) return NextResponse.json({ ok: true, users: [] });

  const [selfR, directR, teamR, countR, claimR] = await db.batch([
    { sql: "SELECT user_id, COALESCE(SUM(actual),0) as t FROM deposits WHERE status='confirmed' GROUP BY user_id", args: [] },
    { sql: "SELECT u.referred_by as code, COALESCE(SUM(d.actual),0) as t FROM users u JOIN deposits d ON d.user_id=u.id AND d.status='confirmed' GROUP BY u.referred_by", args: [] },
    { sql: `WITH RECURSIVE down(root, member) AS (
        SELECT referral_code, referral_code FROM users
        UNION
        SELECT down.root, u.referral_code FROM users u JOIN down ON u.referred_by = down.member
      )
      SELECT down.root as code, COALESCE(SUM(d.actual),0) as t, COUNT(DISTINCT down.member) as members
      FROM down LEFT JOIN users mu ON mu.referral_code = down.member
      LEFT JOIN deposits d ON d.user_id = mu.id AND d.status='confirmed'
      GROUP BY down.root`, args: [] },
    { sql: "SELECT referred_by as code, COUNT(*) as c FROM users GROUP BY referred_by", args: [] },
    { sql: "SELECT user_id, tier FROM reward_claims", args: [] },
  ]);

  const selfM = new Map((selfR.rows as unknown as { user_id: string; t: number }[]).map((r) => [r.user_id, Number(r.t)]));
  const directM = new Map((directR.rows as unknown as { code: string; t: number }[]).map((r) => [r.code, Number(r.t)]));
  const teamM = new Map((teamR.rows as unknown as { code: string; t: number; members: number }[]).map((r) => [r.code, { t: Number(r.t), members: Number(r.members) }]));
  const countM = new Map((countR.rows as unknown as { code: string; c: number }[]).map((r) => [r.code, Number(r.c)]));
  const claimedM = new Map<string, number[]>();
  for (const r of claimR.rows as unknown as { user_id: string; tier: number }[]) {
    if (!claimedM.has(r.user_id)) claimedM.set(r.user_id, []);
    if (!claimedM.get(r.user_id)!.includes(Number(r.tier))) claimedM.get(r.user_id)!.push(Number(r.tier));
  }

  const out = list.map((u) => {
    const self = selfM.get(u.id) ?? 0;
    const direct = directM.get(u.referral_code) ?? 0;
    const tt = teamM.get(u.referral_code);
    const team = Math.max(0, (tt?.t ?? 0) - self);
    const claimed = (claimedM.get(u.id) ?? []).sort((a, b) => a - b);
    const ready = MILESTONES.filter((m) => self >= m.self && direct >= m.direct && team >= m.team && !claimed.includes(m.tier)).map((m) => m.tier);
    return {
      id: u.id, name: u.name, email: u.email, mobile: u.mobile, referral_code: u.referral_code,
      self, direct, team,
      directs: countM.get(u.referral_code) ?? 0,
      teamTotal: Math.max(0, (tt?.members ?? 1) - 1),
      claimed, ready,
    };
  });
  return NextResponse.json({ ok: true, users: out });
}
