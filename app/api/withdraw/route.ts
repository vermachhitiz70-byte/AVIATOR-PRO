import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { inWithdrawWindow, logLedger, walletOf, withdrawalQuote } from "@/lib/mlm";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const db = getDb();
  const settings = await getSettings();
  const r = await db.execute({ sql: "SELECT usd,debit,charge,net,status,created_at FROM withdrawals WHERE user_id=? ORDER BY rowid DESC LIMIT 20", args: [u.id as string] });
  const w = await walletOf(u.id as string);
  // Withdrawable = earning wallets only (deposit/principal wallet is locked).
  const max = Number(w.roi) + Number(w.commission) + Number(w.reward);
  const win = inWithdrawWindow(settings.withdrawStartIST || "07:00", settings.withdrawEndIST || "10:00");
  return NextResponse.json({ ok: true, rows: r.rows, max, window: win, min: Number(settings.minWithdrawal || 2), maxLimit: Number(settings.maxWithdrawal || 25000), chargePct: Number(settings.withdrawalChargePct || 10) });
}

// Client two-wallet rule: the Deposit (Principal) wallet can NEVER be withdrawn.
// Withdrawals come ONLY from earning wallets: ROI + Commission + Reward.
// 10% deduction, min $2, max $25K, ONLY 7–10 AM IST, admin approves manually.
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if ((u as unknown as { is_blocked: number }).is_blocked) return NextResponse.json({ ok: false, error: "Account blocked" }, { status: 403 });
  const { amount, address } = await req.json();
  const settings = await getSettings();
  const minW = Number(settings.minWithdrawal || 2);
  const maxW = Number(settings.maxWithdrawal || 25000);
  const chargePct = Number(settings.withdrawalChargePct || 10);
  const amt = Number(amount);
  if (!amt || amt < minW) return NextResponse.json({ ok: false, error: `Minimum withdrawal $${minW}` }, { status: 400 });
  if (amt > maxW) return NextResponse.json({ ok: false, error: `Maximum withdrawal $${maxW.toLocaleString()}` }, { status: 400 });
  if (!address) return NextResponse.json({ ok: false, error: "BEP20 address required (verify in Profile)" }, { status: 400 });
  const win = inWithdrawWindow(settings.withdrawStartIST || "07:00", settings.withdrawEndIST || "10:00");
  if (!win.ok) return NextResponse.json({ ok: false, error: `Withdrawals only 7:00–10:00 AM IST. Now: ${win.nowIST}` }, { status: 400 });
  const db = getDb();
  const w = await walletOf(u.id as string);
  // Earning wallets only — principal (deposit wallet) is never touched.
  const total = Number(w.roi) + Number(w.commission) + Number(w.reward);
  if (amt > total) return NextResponse.json({ ok: false, error: "Insufficient earning balance (ROI + Commission + Reward)" }, { status: 400 });
  const { debit, charge, net } = withdrawalQuote(amt, chargePct);
  let left = amt;
  const take = (v: number) => { const t = Math.min(v, left); left -= t; return v - t; };
  const nr = take(Number(w.roi));
  const nc = take(Number(w.commission));
  const nw = take(Number(w.reward));
  await db.execute({ sql: "UPDATE wallets SET roi=?,commission=?,reward=? WHERE user_id=?", args: [nr, nc, nw, u.id as string] });
  await db.execute({
    sql: "INSERT INTO withdrawals (id,user_id,source_wallet,usd,debit,charge,net,address,status) VALUES (?,?,?,?,?,?,?,?,?)",
    args: [uid("W"), u.id as string, "principal", amt, debit, charge, net, address, "pending"],
  });
  await logLedger(u.id as string, "withdraw_request", "", -debit, `charge ${charge.toFixed(2)}, net ${net.toFixed(2)}`);
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "withdrawal", `${u.name} requested withdrawal of ${net.toFixed(2)} USDT`] });
  return NextResponse.json({ ok: true, debit, charge, net });
}
