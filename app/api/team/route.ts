import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser, sessionStatus } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { downlineTree, directBusiness, teamBusiness, teamCounts, dailyBusiness } from "@/lib/mlm";
import { EARNING_KINDS } from "@/lib/config";

type TreeNode = { id: string; name: string; referral_code: string; investment: number; earned: number; children: TreeNode[] };

// Nested referral tree (who-under-whom), capped for safety. userId honored for admins.
export async function GET(req: NextRequest) {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  try {
  let uid = u.id as string;
  const params = new URL(req.url).searchParams;
  const q = params.get("userId");
  if (q && q !== uid) {
    const { error } = await requireAdmin();
    if (error) return error;
    uid = q;
  }
  // Client rule: dashboard strip resets daily at 5 AM IST — self = own
  // deposits today, team = downline deposits today. ?daily=1 serves that.
  if (params.get("daily") === "1") {
    const d = await dailyBusiness(uid);
    return NextResponse.json({ ok: true, daily: true, self: d.self, team: d.team, total: d.total, businessDate: d.businessDate, sinceUTC: d.sinceUTC });
  }
  const db = getDb();
  const [biz, direct, counts, tree] = await Promise.all([teamBusiness(uid), directBusiness(uid), teamCounts(uid), downlineTree(uid, 10)]);
  const c = await db.execute({ sql: "SELECT tier FROM reward_claims WHERE user_id=?", args: [uid] });

  // Build nested tree from flat levels (parent linked by referred_by code)
  const byCode = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  const allIds: string[] = [];
  for (const lv of tree) {
    for (const m of lv.members as unknown as { id: string; name: string; referral_code: string; investment: number }[]) {
      if (byCode.size >= 300) break;
      const n: TreeNode = { id: m.id, name: m.name, referral_code: m.referral_code, investment: m.investment, earned: 0, children: [] };
      byCode.set(m.referral_code, n);
      allIds.push(m.id);
    }
  }
  if (allIds.length) {
    const ph = allIds.map(() => "?").join(",");
    const er = await db.execute({
      sql: `SELECT user_id, COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id IN (${ph}) AND kind IN (${EARNING_KINDS.map(() => "?").join(",")}) GROUP BY user_id`,
      args: [...allIds, ...EARNING_KINDS],
    });
    const earnMap = new Map((er.rows as unknown as { user_id: string; t: number }[]).map((r) => [r.user_id, Number(r.t)]));
    for (const n of byCode.values()) n.earned = Math.round((earnMap.get(n.id) ?? 0) * 100) / 100;
  }
  const parentOf = new Map<string, string>();
  if (byCode.size) {
    const codes = [...byCode.keys()].map(() => "?").join(",");
    const pr = await db.execute({ sql: `SELECT referral_code, referred_by FROM users WHERE referral_code IN (${codes})`, args: [...byCode.keys()] });
    for (const r of pr.rows as unknown as { referral_code: string; referred_by: string }[]) parentOf.set(r.referral_code, r.referred_by);
  }
  for (const [code, node] of byCode) {
    const p = parentOf.get(code);
    const parent = p ? byCode.get(p) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return NextResponse.json({
    ok: true,
    name: u.name,
    self: biz.self,
    team: biz.team,
    direct: direct.direct,
    directCount: counts.direct,
    teamTotal: counts.total,
    levels: tree,
    tree: roots,
    claimed: c.rows.map((r) => (r as unknown as { tier: number }).tier),
    referralCode: u.referral_code,
  });
  } catch {
    return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  }
}
