import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { downlineTree, directBusiness, teamBusiness, teamCounts } from "@/lib/mlm";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const uid = u.id as string;
  const [biz, direct, counts, tree] = await Promise.all([teamBusiness(uid), directBusiness(uid), teamCounts(uid), downlineTree(uid, 10)]);
  const c = await (await import("@/lib/db")).getDb().execute({ sql: "SELECT tier FROM reward_claims WHERE user_id=?", args: [uid] });
  return NextResponse.json({
    ok: true,
    self: biz.self,
    team: biz.team,
    direct: direct.direct,
    directCount: counts.direct,
    teamTotal: counts.total,
    levels: tree,
    claimed: c.rows.map((r) => (r as unknown as { tier: number }).tier),
    referralCode: u.referral_code,
  });
}
