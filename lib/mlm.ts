import { getDb, getSettings, uid } from "./db";
import { FIRST_RECHARGE_LEVELS, ROI_LEVELS } from "./config";

export async function walletOf(userId: string) {
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM wallets WHERE user_id=?", args: [userId] });
  if (r.rows.length === 0) {
    await db.execute({ sql: "INSERT INTO wallets (user_id) VALUES (?)", args: [userId] });
    return { user_id: userId, principal: 0, roi: 0, commission: 0, reward: 0 };
  }
  return r.rows[0] as unknown as { user_id: string; principal: number; roi: number; commission: number; reward: number };
}

export async function logLedger(userId: string, kind: string, wallet: string, amount: number, note = "") {
  await getDb().execute({
    sql: "INSERT INTO ledger (id,user_id,kind,wallet,amount,note) VALUES (?,?,?,?,?,?)",
    args: [uid("L"), userId, kind, wallet, amount, note],
  });
}

export async function uplineOf(userId: string, maxLevels: number) {
  const db = getDb();
  const chain: { id: string; referral_code: string }[] = [];
  let cur = userId;
  for (let i = 0; i < maxLevels; i++) {
    const r = await db.execute({ sql: "SELECT referred_by FROM users WHERE id=?", args: [cur] });
    const ref = (r.rows[0] as unknown as { referred_by: string | null } | undefined)?.referred_by;
    if (!ref) break;
    const u = await db.execute({ sql: "SELECT id,referral_code FROM users WHERE referral_code=? OR id=?", args: [ref, ref] });
    if (u.rows.length === 0) break;
    const row = u.rows[0] as unknown as { id: string; referral_code: string };
    chain.push(row);
    cur = row.id;
  }
  return chain;
}

// Client rule: incomes flow ONLY to users holding an active (uncapped) bot.
// Capped/expired/bot-less users earn nothing until they start a new bot.
// Missed income is lost forever (no backpay) — fresh earnings only.
export async function activeBotIds(userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const db = getDb();
  const ph = userIds.map(() => "?").join(",");
  const r = await db.execute({ sql: `SELECT DISTINCT user_id FROM bots WHERE user_id IN (${ph}) AND status='active'`, args: userIds });
  return new Set((r.rows as unknown as { user_id: string }[]).map((x) => x.user_id));
}

// Client rule: EVERY confirmed top-up pays the 5-level recharge commission
// (FIRST_RECHARGE_LEVELS on the new amount) — first, second, third… every
// time the user recharges, the upline earns again. Only active-bot holders earn.
export async function creditFirstRecharge(newUserId: string, amount: number) {
  const db = getDb();
  const chain = await uplineOf(newUserId, 5);
  const live = await activeBotIds(chain.map((c) => c.id));
  for (let i = 0; i < chain.length; i++) {
    if (!live.has(chain[i].id)) continue;
    const pct = FIRST_RECHARGE_LEVELS[i];
    const amt = (amount * pct) / 100;
    if (amt <= 0) continue;
    await db.execute({ sql: "UPDATE wallets SET commission=commission+? WHERE user_id=?", args: [amt, chain[i].id] });
    await db.execute({
      sql: "INSERT INTO commissions (id,from_user,to_user,type,level,pct,amount) VALUES (?,?,?,?,?,?,?)",
      args: [uid("C"), newUserId, chain[i].id, "first_recharge", i + 1, pct, amt],
    });
    await logLedger(chain[i].id, "first_recharge", "commission", amt, `L${i + 1} first recharge of ${newUserId}`);
  }
}

export async function creditRoiLevels(earnerId: string, roiAmount: number) {
  const db = getDb();
  const chain = await uplineOf(earnerId, 10);
  const live = await activeBotIds(chain.map((c) => c.id));
  for (let i = 0; i < chain.length; i++) {
    if (!live.has(chain[i].id)) continue;
    const pct = ROI_LEVELS[i];
    const amt = (roiAmount * pct) / 100;
    if (amt <= 0) continue;
    await db.execute({ sql: "UPDATE wallets SET commission=commission+? WHERE user_id=?", args: [amt, chain[i].id] });
    await db.execute({
      sql: "INSERT INTO commissions (id,from_user,to_user,type,level,pct,amount) VALUES (?,?,?,?,?,?,?)",
      args: [uid("C"), earnerId, chain[i].id, "roi_level", i + 1, pct, amt],
    });
    await logLedger(chain[i].id, "roi_level", "commission", amt, `L${i + 1} ROI of ${earnerId}`);
  }
}
export async function teamBusiness(userId: string): Promise<{ self: number; team: number }> {
  const db = getDb();
  const s = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [userId] });
  const self = Number((s.rows[0] as unknown as { t: number }).t ?? 0);
  // NOTE: referred_by stores REFERRAL CODES, so BFS must walk codes (not user ids).
  const me = await db.execute({ sql: "SELECT referral_code FROM users WHERE id=?", args: [userId] });
  const myCode = (me.rows[0] as unknown as { referral_code: string } | undefined)?.referral_code;
  if (!myCode) return { self, team: 0 };
  let team = 0;
  let queue = [myCode];
  const seen = new Set<string>([myCode]);
  for (let depth = 0; depth < 12 && queue.length; depth++) {
    const placeholders = queue.map(() => "?").join(",");
    const kids = await db.execute({ sql: `SELECT id,referral_code FROM users WHERE referred_by IN (${placeholders})`, args: queue });
    queue = [];
    for (const k of kids.rows) {
      const row = k as unknown as { id: string; referral_code: string };
      if (!row.referral_code || seen.has(row.referral_code)) continue;
      seen.add(row.referral_code);
      queue.push(row.referral_code);
      const d = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [row.id] });
      team += Number((d.rows[0] as unknown as { t: number }).t ?? 0);
      if (seen.size > 5000) break;
    }
  }
  return { self, team };
}

// Client rank system: self + DIRECT (L1 only) business for milestone evaluation.
export async function directBusiness(userId: string): Promise<{ self: number; direct: number }> {
  const db = getDb();
  const s = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [userId] });
  const self = Number((s.rows[0] as unknown as { t: number }).t ?? 0);
  const me = await db.execute({ sql: "SELECT referral_code FROM users WHERE id=?", args: [userId] });
  const myCode = (me.rows[0] as unknown as { referral_code: string } | undefined)?.referral_code;
  if (!myCode) return { self, direct: 0 };
  const d = await db.execute({
    sql: "SELECT COALESCE(SUM((SELECT COALESCE(SUM(actual),0) FROM deposits WHERE user_id=u.id AND status='confirmed')),0) as t FROM users u WHERE u.referred_by=?",
    args: [myCode],
  });
  return { self, direct: Number((d.rows[0] as unknown as { t: number }).t ?? 0) };
}

// Client capping rule: ROI + Rewards + Self-Game earnings ALL count toward the
// package cap (Direct + Level income stay outside). Rewards and game P&L are
// per-user, so they count from the bot's start date against that bot's cap.
export async function cappedExtras(userId: string, sinceDate: string): Promise<number> {
  const db = getDb();
  const r = await db.execute({
    sql: "SELECT COALESCE(SUM(amount),0) as t FROM ledger WHERE user_id=? AND kind IN ('reward','game_profit','game_loss') AND date(created_at)>=date(?)",
    args: [userId, sinceDate.slice(0, 10)],
  });
  return Math.max(0, Number((r.rows[0] as unknown as { t: number }).t ?? 0));
}

// Level-wise downline tree for Team page (BFS, 10 levels)
export async function downlineTree(userId: string, maxDepth = 10) {
  const db = getDb();
  const me = await db.execute({ sql: "SELECT referral_code FROM users WHERE id=?", args: [userId] });
  const myCode = (me.rows[0] as unknown as { referral_code: string } | undefined)?.referral_code;
  if (!myCode) return [];
  const levels: { level: number; members: { id: string; name: string; referral_code: string; investment: number; created_at: string }[] }[] = [];
  let current = [myCode];
  for (let level = 1; level <= maxDepth; level++) {
    const placeholders = current.map(() => "?").join(",");
    const r = await db.execute({
      sql: `SELECT id,name,referral_code,created_at FROM users WHERE referred_by IN (${placeholders})`,
      args: current,
    });
    if (r.rows.length === 0) break;
    const members = [];
    const nextCodes: string[] = [];
    for (const row of r.rows) {
      const m = row as unknown as { id: string; name: string; referral_code: string; created_at: string };
      const d = await db.execute({ sql: "SELECT COALESCE(SUM(actual),0) as t FROM deposits WHERE user_id=? AND status='confirmed'", args: [m.id] });
      members.push({ ...m, investment: Number((d.rows[0] as unknown as { t: number }).t ?? 0) });
      nextCodes.push(m.referral_code);
    }
    levels.push({ level, members });
    current = nextCodes;
  }
  return levels;
}

export async function teamCounts(userId: string) {
  const db = getDb();
  const me = await db.execute({ sql: "SELECT referral_code FROM users WHERE id=?", args: [userId] });
  const myCode = (me.rows[0] as unknown as { referral_code: string } | undefined)?.referral_code;
  if (!myCode) return { direct: 0, total: 0 };
  const d = await db.execute({ sql: "SELECT COUNT(*) as c FROM users WHERE referred_by=?", args: [myCode] });
  const tree = await downlineTree(userId, 12);
  return { direct: Number((d.rows[0] as unknown as { c: number }).c), total: tree.reduce((n, l) => n + l.members.length, 0) };
}

export function withdrawalQuote(amount: number, chargePct: number) {
  const debit = amount;
  const charge = (amount * chargePct) / 100;
  return { debit, charge, net: debit - charge };
}

// PRD 3.7: withdrawals only 7:00–10:00 AM IST. Returns {ok, nowIST}
export function inWithdrawWindow(startHHMM: string, endHHMM: string, now = new Date()) {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  const cur = `${String(ist.getHours()).padStart(2, "0")}:${String(ist.getMinutes()).padStart(2, "0")}`;
  const label = ist.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { ok: cur >= startHHMM && cur <= endHHMM, nowIST: `${cur} (${label})` };
}

export async function getSetting(key: string) {
  const s = await getSettings();
  return s[key];
}
