import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, uid } from "@/lib/db";
import { currentUser, sessionStatus } from "@/lib/auth";
import { inWithdrawWindow, logLedger, walletOf, withdrawalQuote } from "@/lib/mlm";
import { isKilled } from "@/lib/shutdown";
import { sendProof, withdrawProof } from "@/lib/telegram";

export async function GET() {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const db = getDb();
  const settings = await getSettings();
  const r = await db.execute({ sql: "SELECT usd,debit,charge,net,status,payout_tx,created_at FROM withdrawals WHERE user_id=? ORDER BY rowid DESC LIMIT 20", args: [u.id as string] });
  const w = await walletOf(u.id as string);
  // Withdrawable = earning wallets only (deposit/principal wallet is locked).
  const balances = { roi: Number(w.roi), commission: Number(w.commission), reward: Number(w.reward) };
  const max = balances.roi + balances.commission + balances.reward;
  const win = inWithdrawWindow(settings.withdrawStartIST || "08:00", settings.withdrawEndIST || "10:00");
  return NextResponse.json({ ok: true, rows: r.rows, max, balances, window: win, min: Number(settings.minWithdrawal || 2), maxLimit: Number(settings.maxWithdrawal || 25000), chargePct: Number(settings.withdrawalChargePct || 10) });
}

// Client two-wallet rule: the Deposit (Principal) wallet can NEVER be withdrawn.
// Withdrawals come ONLY from earning wallets: ROI + Commission + Reward.
// 10% deduction, min $2, max $25K, ONLY 8–10 AM IST, admin approves manually.
export async function POST(req: NextRequest) {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  try {
  if (await isKilled("withdraw"))
    return NextResponse.json({ ok: false, error: "Withdrawals are paused for maintenance. Your balance is safe." }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  if ((u as unknown as { is_blocked: number }).is_blocked) return NextResponse.json({ ok: false, error: "Account blocked" }, { status: 403 });
  const { amount, wallet: walletChoice } = await req.json();
  // Payout always goes to the saved profile BEP20 — never typed per request.
  const address = String((u as unknown as { bep20_address: string }).bep20_address || "");
  const settings = await getSettings();
  const minW = Number(settings.minWithdrawal || 2);
  const maxW = Number(settings.maxWithdrawal || 25000);
  const chargePct = Number(settings.withdrawalChargePct || 10);
  const amt = Number(amount);
  if (!amt || amt < minW) return NextResponse.json({ ok: false, error: `Minimum withdrawal $${minW}` }, { status: 400 });
  if (amt > maxW) return NextResponse.json({ ok: false, error: `Maximum withdrawal $${maxW.toLocaleString()}` }, { status: 400 });
  if (!address) return NextResponse.json({ ok: false, error: "BEP20 address required (verify in Profile)" }, { status: 400 });
  // Client rule: user picks ONE earning wallet per request (principal is never withdrawable)
  const src = ["roi", "commission", "reward"].includes(walletChoice) ? walletChoice : null;
  if (!src) return NextResponse.json({ ok: false, error: "Select a wallet: ROI, Commission or Reward" }, { status: 400 });
  const win = inWithdrawWindow(settings.withdrawStartIST || "08:00", settings.withdrawEndIST || "10:00");
  if (!win.ok) return NextResponse.json({ ok: false, error: `Withdrawals only 8:00–10:00 AM. Now: ${win.nowIST}` }, { status: 400 });
  const db = getDb();
  // Client rule: only ONE withdrawal per wallet per day (one wallet at a time,
  // never all incomes together — gives admin breathing room for payouts).
  const todayCount = await db.execute({ sql: "SELECT COUNT(*) as c FROM withdrawals WHERE user_id=? AND source_wallet=? AND date(created_at)=date('now')", args: [u.id as string, src] });
  if (Number((todayCount.rows[0] as unknown as { c: number }).c) > 0)
    return NextResponse.json({ ok: false, error: "One withdrawal per wallet per day. Try another wallet or come back tomorrow." }, { status: 400 });
  const w = await walletOf(u.id as string);
  const srcBal = Number((w as unknown as Record<string, number>)[src] ?? 0);
  if (amt > srcBal) return NextResponse.json({ ok: false, error: `Insufficient ${src} balance ($${srcBal.toFixed(2)})` }, { status: 400 });
  const { debit, charge, net } = withdrawalQuote(amt, chargePct);
  await db.execute({ sql: `UPDATE wallets SET ${src}=${src}-? WHERE user_id=?`, args: [debit, u.id as string] });
  await db.execute({
    sql: "INSERT INTO withdrawals (id,user_id,source_wallet,usd,debit,charge,net,address,status) VALUES (?,?,?,?,?,?,?,?,?)",
    args: [uid("W"), u.id as string, src, amt, debit, charge, net, address, "pending"],
  });
  await logLedger(u.id as string, "withdraw_request", src, -debit, `charge ${charge.toFixed(2)}, net ${net.toFixed(2)}`);
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "withdrawal", `${u.name} requested withdrawal of ${net.toFixed(2)} USDT`] });
  // Live proof channel: awaited (serverless freezes background work after
  // response, so fire-and-forget would silently die). Fails safe internally.
  const proofSent = await sendProof(withdrawProof({
    name: String((u as unknown as { name: string }).name || "Member"),
    code: String((u as unknown as { referral_code: string }).referral_code || ""),
    email: String((u as unknown as { email: string }).email || ""),
    amount: amt, net, wallet: address,
  }));
  if (!proofSent) console.warn("telegram withdraw proof not sent");
  return NextResponse.json({ ok: true, debit, charge, net });
  } catch {
    return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  }
}
