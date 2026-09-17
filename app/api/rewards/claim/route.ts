import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { MILESTONES } from "@/lib/config";
import { directBusiness, logLedger, teamBusiness } from "@/lib/mlm";

// POST { tier } – claim a milestone reward once when self+direct+team thresholds are met
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const { tier } = await req.json();
  const m = MILESTONES.find((x) => x.tier === Number(tier));
  if (!m) return NextResponse.json({ ok: false, error: "Bad tier" }, { status: 400 });
  const db = getDb();
  const done = await db.execute({ sql: "SELECT id FROM reward_claims WHERE user_id=? AND tier=?", args: [u.id as string, m.tier] });
  if (done.rows.length) return NextResponse.json({ ok: false, error: "Already claimed" }, { status: 400 });
  const { self, direct } = await directBusiness(u.id as string);
  const { team } = await teamBusiness(u.id as string);
  if (self < m.self || direct < m.direct || team < m.team)
    return NextResponse.json({ ok: false, error: `Need self $${m.self.toLocaleString()} + direct $${m.direct.toLocaleString()} + team $${m.team.toLocaleString()}` }, { status: 400 });
  await db.execute({ sql: "INSERT INTO reward_claims (id,user_id,tier) VALUES (?,?,?)", args: [uid("R"), u.id as string, m.tier] });
  await db.execute({ sql: "UPDATE wallets SET reward=reward+? WHERE user_id=?", args: [m.wallet, u.id as string] });
  await logLedger(u.id as string, "reward", "reward", m.wallet, m.name);
  return NextResponse.json({ ok: true, credited: m.wallet });
}
