import { getDb, uid } from "./db";
import { downlineTree } from "./mlm";

export interface Campaign {
  id: string;
  name: string;
  location: string;
  meeting_date: string;
  eligibility_end: string;
  status: string;
  criteria_json: string;
}

export interface Criteria {
  kpis: { key: string; label: string; target: number }[];
  leadership: { self: number; teamL2_10: number; direct: number };
  selfPath: { self: number; direct: number };
}

export const DEFAULT_CRITERIA: Criteria = {
  kpis: [
    { key: "leadershipSelf", label: "Leadership Self", target: 10000 },
    { key: "teamL2_10", label: "L2–L10 Team Business", target: 100000 },
    { key: "direct", label: "Direct Business", target: 100000 },
    { key: "selfCriteria", label: "Self Criteria", target: 10000 },
  ],
  leadership: { self: 1000, teamL2_10: 10000, direct: 10000 },
  selfPath: { self: 10000, direct: 10000 },
};

export function parseCriteria(json: string): Criteria {
  try {
    const c = JSON.parse(json || "{}");
    if (!c.kpis || !c.leadership || !c.selfPath) return DEFAULT_CRITERIA;
    return c as Criteria;
  } catch {
    return DEFAULT_CRITERIA;
  }
}

// Business metrics for campaigns: self + direct (L1) + L2–L10 team
export async function campaignMetrics(userId: string) {
  const db = getDb();
  const s = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [userId] });
  const self = Number((s.rows[0] as unknown as { t: number }).t ?? 0);
  const tree = await downlineTree(userId, 10);
  let direct = 0;
  let teamL2_10 = 0;
  for (const lvl of tree) {
    const sum = lvl.members.reduce((n, m) => n + m.investment, 0);
    if (lvl.level === 1) direct += sum;
    else teamL2_10 += sum;
  }
  return { self, direct, teamL2_10 };
}

export interface KpiState {
  key: string;
  label: string;
  value: number;
  target: number;
  done: boolean;
  pct: number;
}

export async function evaluateCampaign(userId: string, camp: Campaign) {
  const crit = parseCriteria(camp.criteria_json);
  const m = await campaignMetrics(userId);
  const val: Record<string, number> = {
    leadershipSelf: m.self,
    teamL2_10: m.teamL2_10,
    direct: m.direct,
    selfCriteria: m.self,
  };
  const kpis: KpiState[] = crit.kpis.map((k) => ({
    ...k,
    value: val[k.key] ?? 0,
    done: (val[k.key] ?? 0) >= k.target,
    pct: Math.min(100, Math.round(((val[k.key] ?? 0) / k.target) * 100)),
  }));
  const leadershipOk = m.self >= crit.leadership.self && m.teamL2_10 >= crit.leadership.teamL2_10 && m.direct >= crit.leadership.direct;
  const selfOk = m.self >= crit.selfPath.self && m.direct >= crit.selfPath.direct;
  return { metrics: m, kpis, leadershipOk, selfOk, achieved: leadershipOk || selfOk, criteria: crit };
}

// Record achievement once (called on campaign view + nightly cron)
export async function checkAndRecord(userId: string, camp: Campaign) {
  const db = getDb();
  const ev = await evaluateCampaign(userId, camp);
  if (!ev.achieved) return ev;
  const ex = await db.execute({ sql: "SELECT id FROM campaign_achievers WHERE campaign_id=? AND user_id=?", args: [camp.id, userId] });
  if (ex.rows.length === 0) {
    const u = await db.execute({ sql: "SELECT name,country,referral_code FROM users WHERE id=?", args: [userId] });
    const row = u.rows[0] as unknown as { name: string; country: string; referral_code: string };
    const w = await db.execute({ sql: "SELECT COALESCE(principal,0)+COALESCE(roi,0)+COALESCE(commission,0)+COALESCE(reward,0) as t FROM wallets WHERE user_id=?", args: [userId] });
    await db.execute({
      sql: "INSERT INTO campaign_achievers (id,campaign_id,user_id,name,country,user_code,earned,is_demo,notified) VALUES (?,?,?,?,?,?,?,?,?)",
      args: [uid("CA"), camp.id, userId, row.name, row.country || "", row.referral_code, Number((w.rows[0] as unknown as { t: number }).t ?? 0), 0, 0],
    });
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "registration", `${row.name} achieved ${camp.name}`] });
  }
  return ev;
}

export async function leaderboard(campaignId: string) {
  const r = await getDb().execute({
    sql: "SELECT name,country,user_code,earned,is_demo,achieved_at FROM campaign_achievers WHERE campaign_id=? ORDER BY earned DESC LIMIT 50",
    args: [campaignId],
  });
  return r.rows;
}

export async function unnotified(userId: string) {
  const r = await getDb().execute({
    sql: "SELECT ca.campaign_id, c.name FROM campaign_achievers ca JOIN campaigns c ON c.id=ca.campaign_id WHERE ca.user_id=? AND ca.notified=0 AND ca.is_demo=0",
    args: [userId],
  });
  return r.rows;
}
