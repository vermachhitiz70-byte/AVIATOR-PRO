import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { BUSINESS_RULES, planForAmount } from "@/lib/config";
import { walletOf } from "@/lib/mlm";

export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  const { amount } = await req.json();
  const amt = Number(amount);
  // Client rule: manual start only, min $10, always in multiples of $10
  // (10, 20, 30 … 100, 110 …). No auto-bot: deposit alone earns nothing.
  if (!amt || amt < 10 || amt > 100000 || amt % 10 !== 0)
    return NextResponse.json({ ok: false, error: "Bot amount must be $10–$100,000 in multiples of $10 (10, 20, 30 …)" }, { status: 400 });
  const plan = planForAmount(amt);
  if (!plan) return NextResponse.json({ ok: false, error: "Amount outside all tiers" }, { status: 400 });
  const db = getDb();
  const w = await walletOf(u.id as string);
  if (Number(w.principal) < amt) return NextResponse.json({ ok: false, error: "Insufficient Principal wallet. Recharge first." }, { status: 400 });
  // Unlimited bots per ID (client rule): every activation with sufficient
  // principal creates one more bot. Each bot earns/caps/expires independently.
  await db.execute({ sql: "UPDATE wallets SET principal=principal-? WHERE user_id=?", args: [amt, u.id as string] });
  const id = uid("B");
  const expiry = new Date(Date.now() + BUSINESS_RULES.botValidityDays * 86400000).toISOString();
  await db.execute({
    sql: "INSERT INTO bots (id,user_id,plan,amount,daily_pct,start_date,expiry_date,total_earned,status) VALUES (?,?,?,?,?,datetime('now'),?,?,?)",
    args: [id, u.id as string, plan.name, amt, plan.dailyPct, expiry, 0, "active"],
  });
  return NextResponse.json({ ok: true, plan: plan.name, daily_pct: plan.dailyPct, bot: { id, plan: plan.name, amount: amt } });
}
