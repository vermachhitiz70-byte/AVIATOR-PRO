import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/money-trail?userId= — full chronological money story for ANY user:
// deposits, bot activations, every income (with WHO it came from), withdrawals.
// One list, newest first, exact timestamps. Admin only.
type Ev = { ts: string; label: string; detail: string; amount: number | null };

export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const userId = new URL(req.url).searchParams.get("userId") || "";
  if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
  const db = getDb();
  const u = await db.execute({ sql: "SELECT id,name,email,referral_code,created_at FROM users WHERE id=?", args: [userId] });
  if (!u.rows.length) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
  const user = u.rows[0] as unknown as { id: string; name: string; email: string; referral_code: string; created_at: string };
  const ev: Ev[] = [];

  const deps = await db.execute({ sql: "SELECT request_id,requested,actual,tx_hash,status,created_at FROM deposits WHERE user_id=? ORDER BY rowid", args: [userId] });
  for (const d of deps.rows as unknown as { request_id: string; requested: number; actual: number; tx_hash: string; status: string; created_at: string }[]) {
    ev.push({ ts: d.created_at, label: d.status === "confirmed" ? "Deposit confirmed" : `Recharge ${d.status}`, detail: `${d.request_id} · TX ${String(d.tx_hash || "-").slice(0, 12)}… → Deposit wallet`, amount: d.status === "confirmed" ? Number(d.actual) : null });
  }
  const bots = await db.execute({ sql: "SELECT plan,amount,daily_pct,start_date,expiry_date,total_earned,status FROM bots WHERE user_id=? ORDER BY rowid", args: [userId] });
  for (const b of bots.rows as unknown as { plan: string; amount: number; daily_pct: number; start_date: string; expiry_date: string; total_earned: number; status: string }[]) {
    ev.push({ ts: b.start_date, label: "Bot activated", detail: `${b.plan} · $${Number(b.amount).toLocaleString()} @ ${b.daily_pct}% daily · earned $${Number(b.total_earned).toFixed(2)} · ${b.status}`, amount: null });
  }
  const led = await db.execute({
    sql: "SELECT kind,wallet,amount,note,created_at FROM ledger WHERE user_id=? AND kind IN ('daily_roi','game_profit','game_loss','first_recharge','roi_level','reward') ORDER BY rowid",
    args: [userId],
  });
  const kindLabel: Record<string, string> = {
    daily_roi: "Daily ROI (tier %)", game_profit: "Self trade profit", game_loss: "Self trade loss",
    first_recharge: "Direct income", roi_level: "Level income (downline ROI %)", reward: "Reward income",
  };
  for (const h of led.rows as unknown as { kind: string; wallet: string; amount: number; note: string; created_at: string }[]) {
    ev.push({ ts: h.created_at, label: kindLabel[h.kind] || h.kind, detail: `${h.note} · ${h.wallet} wallet`, amount: Number(h.amount) });
  }
  // Who paid each commission? resolve earner names in one query.
  const comms = await db.execute({ sql: "SELECT type,level,pct,amount,created_at,from_user FROM commissions WHERE to_user=? ORDER BY rowid", args: [userId] });
  const fromIds = [...new Set((comms.rows as unknown as { from_user: string }[]).map((c) => c.from_user))];
  const nameMap = new Map<string, string>();
  if (fromIds.length) {
    const ph = fromIds.map(() => "?").join(",");
    const nm = await db.execute({ sql: `SELECT id,name,referral_code FROM users WHERE id IN (${ph})`, args: fromIds });
    for (const r of nm.rows as unknown as { id: string; name: string; referral_code: string }[]) nameMap.set(r.id, `${r.name} (${r.referral_code})`);
  }
  // Attach earner names: match commission rows to ledger rows by (ts, amount)
  const commList = comms.rows as unknown as { type: string; level: number; pct: number; amount: number; created_at: string; from_user: string }[];
  for (const e of ev) {
    if ((e.label === "Direct income" || e.label.startsWith("Level income")) && e.amount !== null) {
      const idx = commList.findIndex((c) => c.created_at === e.ts && Number(c.amount) === Number(e.amount));
      if (idx >= 0) {
        const c = commList.splice(idx, 1)[0];
        const who = nameMap.get(c.from_user) || c.from_user;
        e.label = c.type === "first_recharge" ? `Direct income · L${c.level}` : `Level income · L${c.level}`;
        e.detail = `${who} se — ${c.pct}% · ${e.detail}`;
      }
    }
  }
  const wds = await db.execute({ sql: "SELECT usd,debit,charge,net,status,source_wallet,created_at FROM withdrawals WHERE user_id=? ORDER BY rowid", args: [userId] });
  for (const w of wds.rows as unknown as { usd: number; debit: number; charge: number; net: number; status: string; source_wallet: string; created_at: string }[]) {
    ev.push({ ts: w.created_at, label: `Withdrawal ${w.status}`, detail: `${w.source_wallet} wallet se — debit $${Number(w.debit).toFixed(2)}, charge $${Number(w.charge).toFixed(2)}, net $${Number(w.net).toFixed(2)}`, amount: -Number(w.debit) });
  }
  ev.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  const invested = (deps.rows as unknown as { actual: number; status: string }[]).filter((d) => d.status === "confirmed").reduce((n, d) => n + Number(d.actual), 0);
  const earned = (led.rows as unknown as { amount: number }[]).reduce((n, h) => n + Number(h.amount), 0);
  const w = await db.execute({ sql: "SELECT principal,roi,commission,reward FROM wallets WHERE user_id=?", args: [userId] });
  const wal = (w.rows[0] || {}) as unknown as Record<string, number>;
  return NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, referral_code: user.referral_code, joined: user.created_at },
    summary: {
      invested: Math.round(invested * 100) / 100,
      earned: Math.round(earned * 100) / 100,
      balance: Math.round((Number(wal.principal || 0) + Number(wal.roi || 0) + Number(wal.commission || 0) + Number(wal.reward || 0)) * 100) / 100,
    },
    events: ev,
  });
}
