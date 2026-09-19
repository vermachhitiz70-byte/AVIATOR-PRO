import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { uplineOf } from "@/lib/mlm";
import { ROI_LEVELS } from "@/lib/config";

// DANGER: full platform reset. Admin-only + explicit confirm string.
// 1) Reverses ALL dummy-game money (wallets + game levels), deletes game rows.
// 2) Wipes every non-admin user and all their data; resets admin wallets to 0;
//    clears activities/ledger/commissions/achievers. Keeps settings/meta/campaigns.
// This route will be REMOVED after the reset + audit (single-use tool).
export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "WIPE-ALL-CONFIRMED") return NextResponse.json({ ok: false, error: "confirm required" }, { status: 400 });
  const db = getDb();
  const log: string[] = [];

  // ---- Step 1: reverse dummy-game money ----
  const nets = await db.execute({ sql: "SELECT user_id, COALESCE(SUM(roi_amount),0) as g FROM gameplay GROUP BY user_id", args: [] });
  let walletsFixed = 0;
  for (const r of nets.rows as unknown as { user_id: string; g: number }[]) {
    const g = Number(r.g ?? 0);
    if (g !== 0) {
      // floor at 0: money may already have moved (withdrawals) — never go negative
      await db.execute({ sql: "UPDATE wallets SET roi=CASE WHEN roi-?<0 THEN 0 ELSE roi-? END WHERE user_id=?", args: [g, g, r.user_id] });
      walletsFixed++;
    }
  }
  log.push(`game nets reversed for ${walletsFixed} users`);
  const pos = await db.execute({ sql: "SELECT user_id,roi_amount,created_at FROM gameplay WHERE roi_amount>0 ORDER BY rowid", args: [] });
  let levelsReversed = 0;
  for (const g of pos.rows as unknown as { user_id: string; roi_amount: number; created_at: string }[]) {
    const delta = Number(g.roi_amount);
    const chain = await uplineOf(g.user_id, 10);
    for (let i = 0; i < chain.length; i++) {
      const amt = (delta * ROI_LEVELS[i]) / 100;
      if (amt <= 0) continue;
      await db.execute({ sql: "UPDATE wallets SET commission=CASE WHEN commission-?<0 THEN 0 ELSE commission-? END WHERE user_id=?", args: [amt, amt, chain[i].id] });
      await db.execute({ sql: "DELETE FROM commissions WHERE rowid=(SELECT rowid FROM commissions WHERE from_user=? AND to_user=? AND type='roi_level' AND level=? AND ABS(amount-?)<1e-9 ORDER BY rowid LIMIT 1)", args: [g.user_id, chain[i].id, i + 1, amt] });
      await db.execute({ sql: "DELETE FROM ledger WHERE rowid=(SELECT rowid FROM ledger WHERE user_id=? AND kind='roi_level' AND ABS(amount-?)<1e-9 AND note LIKE ? ORDER BY rowid LIMIT 1)", args: [chain[i].id, amt, `%${g.user_id}%`] });
      levelsReversed++;
    }
  }
  log.push(`game level payouts reversed: ${levelsReversed}`);
  await db.execute("DELETE FROM gameplay");
  await db.execute("DELETE FROM ledger WHERE kind IN ('game_profit','game_loss')");
  log.push("gameplay + game ledger wiped");

  // ---- Step 2: wipe all non-admin users + everything ----
  const users = await db.execute({ sql: "SELECT id FROM users WHERE is_admin=0 OR is_admin IS NULL", args: [] });
  const ids = (users.rows as unknown as { id: string }[]).map((r) => r.id);
  for (const id of ids) {
    await db.execute({ sql: "DELETE FROM commissions WHERE from_user=? OR to_user=?", args: [id, id] });
    for (const t of ["ledger", "deposits", "withdrawals", "bots", "support_tickets", "campaign_achievers", "wallets", "reward_claims"]) {
      await db.execute({ sql: `DELETE FROM ${t} WHERE user_id=?`, args: [id] });
    }
    await db.execute({ sql: "DELETE FROM users WHERE id=?", args: [id] });
  }
  log.push(`users wiped: ${ids.length}`);
  await db.execute("DELETE FROM activities");
  await db.execute("DELETE FROM commissions");
  await db.execute("DELETE FROM ledger");
  await db.execute("DELETE FROM campaign_achievers");
  await db.execute("UPDATE wallets SET principal=0,roi=0,commission=0,reward=0 WHERE user_id IN (SELECT id FROM users WHERE is_admin=1)");
  const left = await db.execute("SELECT COUNT(*) as c FROM users");
  log.push(`users left: ${Number((left.rows[0] as unknown as { c: number }).c)} (admin only)`);
  return NextResponse.json({ ok: true, log });
}
