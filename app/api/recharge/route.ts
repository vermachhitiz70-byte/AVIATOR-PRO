import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb, uid } from "@/lib/db";
import { currentUser, sessionStatus } from "@/lib/auth";
import { logLedger } from "@/lib/mlm";
import { DEPOSIT_ADDRESS } from "@/lib/config";
import { depositProof, sendProof } from "@/lib/telegram";

function cleanAddress(v: unknown) {
  const s = String(v || "").trim();
  if (!s || s.includes("YOUR")) return DEPOSIT_ADDRESS;
  return s;
}

// PRD 3.3: manual/semi-auto BEP20. User submits TX hash -> PENDING.
// Balance is credited ONLY after admin approval (fixes auto-credit).
export async function GET() {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const db = getDb();
  const settings = await getSettings();
  const r = await db.execute({ sql: "SELECT request_id,requested,actual,status,created_at FROM deposits WHERE user_id=? ORDER BY rowid DESC LIMIT 20", args: [u.id as string] });
  return NextResponse.json({ ok: true, rows: r.rows, address: cleanAddress(settings.depositAddress), qr: String(settings.depositQr || "").slice(0, 1000000) });
}

export async function POST(req: NextRequest) {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  if ((u as unknown as { is_blocked: number }).is_blocked) return NextResponse.json({ ok: false, error: "Account blocked" }, { status: 403 });
  const { amount, tx_hash, screenshot_url } = await req.json();
  const settings = await getSettings();
  const minDep = Number(settings.minDeposit || 10);
  const amt = Number(amount);
  if (!amt || amt < minDep) return NextResponse.json({ ok: false, error: `Minimum investment $${minDep}` }, { status: 400 });
  if (!tx_hash) return NextResponse.json({ ok: false, error: "Transaction hash required" }, { status: 400 });
  if (!screenshot_url) return NextResponse.json({ ok: false, error: "Payment screenshot required" }, { status: 400 });
  const db = getDb();
  const dup = await db.execute({ sql: "SELECT id FROM deposits WHERE tx_hash=?", args: [tx_hash] });
  if (dup.rows.length) return NextResponse.json({ ok: false, error: "This TX hash was already submitted" }, { status: 400 });
  const count = await db.execute({ sql: "SELECT COUNT(*) as c FROM deposits", args: [] });
  const request_id = `AVP-${String(Number((count.rows[0] as unknown as { c: number }).c) + 325).padStart(8, "0")}${Date.now().toString().slice(-6)}`;
  const requested = amt * 0.99906513882;
  await db.execute({
    sql: "INSERT INTO deposits (id,user_id,request_id,requested,actual,tx_hash,screenshot_url,status) VALUES (?,?,?,?,?,?,?,?)",
    args: [uid("D"), u.id as string, request_id, requested, amt, tx_hash, screenshot_url, "pending"],
  });
  await logLedger(u.id as string, "deposit_request", "", amt, request_id);
  // Live proof channel (never blocks the response).
  void sendProof(depositProof({
    name: String((u as unknown as { name: string }).name || "Member"),
    code: String((u as unknown as { referral_code: string }).referral_code || ""),
    email: String((u as unknown as { email: string }).email || ""),
    amount: amt, tx: tx_hash,
  })).catch(() => {});
  return NextResponse.json({ ok: true, request_id, pending: true });
}
