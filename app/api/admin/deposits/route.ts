import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { creditFirstRecharge, logLedger } from "@/lib/mlm";

export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const db = getDb();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 25)));
  const offset = (page - 1) * limit;
  const status = new URL(req.url).searchParams.get("status") || "";
  const q = new URL(req.url).searchParams.get("q") || "";
  const from = new URL(req.url).searchParams.get("from") || "";
  const to = new URL(req.url).searchParams.get("to") || "";

  let where = "1=1";
  const args: (string | number)[] = [];
  if (status && status !== "all") { where += " AND d.status=?"; args.push(status); }
  if (from) { where += " AND date(d.created_at)>=?"; args.push(from); }
  if (to) { where += " AND date(d.created_at)<=?"; args.push(to); }
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR d.request_id LIKE ? OR d.tx_hash LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM deposits d JOIN users u ON d.user_id=u.id WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT d.*, u.name, u.email, u.referral_code FROM deposits d JOIN users u ON d.user_id=u.id WHERE ${where} ORDER BY d.rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, rows: (rows as unknown as { rows: Record<string, unknown>[] }).rows, total, page, limit });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const db = getDb();
  const { id, action, remark, actual } = body;

  if (action === "approve") {
    const dep = await db.execute({ sql: "SELECT * FROM deposits WHERE id=?", args: [id] });
    if (!dep.rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    const d = dep.rows[0] as unknown as { id: string; user_id: string; requested: number; actual: number; status: string; request_id: string };
    if (d.status !== "pending") return NextResponse.json({ ok: false, error: "Already processed" }, { status: 400 });
    const cred = actual ? Number(actual) : d.actual;
    await db.execute("UPDATE deposits SET status='confirmed', actual=?, admin_remark=? WHERE id=?", [cred, remark || "", id]);
    await db.execute("UPDATE wallets SET principal=principal+? WHERE user_id=?", [cred, d.user_id]);
    await logLedger(d.user_id, "deposit_confirm", "principal", cred, d.request_id);
    await creditFirstRecharge(d.user_id, cred);
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "investment", `Deposit confirmed: ${cred.toFixed(2)} USDT`] });
    return NextResponse.json({ ok: true });
  }
  if (action === "reject") {
    await db.execute("UPDATE deposits SET status='rejected', admin_remark=? WHERE id=?", [remark || "", id]);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
