import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { creditFirstRecharge, logLedger } from "@/lib/mlm";

// GET ?status=pending|confirmed|rejected|all
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const sql = status === "all"
    ? "SELECT d.*,u.name,u.email,u.mobile FROM deposits d LEFT JOIN users u ON u.id=d.user_id ORDER BY d.rowid DESC LIMIT 100"
    : "SELECT d.*,u.name,u.email,u.mobile FROM deposits d LEFT JOIN users u ON u.id=d.user_id WHERE d.status=? ORDER BY d.rowid DESC LIMIT 100";
  const r = await getDb().execute(status === "all" ? sql : { sql, args: [status] });
  return NextResponse.json({ ok: true, rows: r.rows });
}

// POST { id, action: approve|reject, remark?, actual? }
export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { id, action, remark, actual } = await req.json();
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM deposits WHERE id=?", args: [id] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const d = r.rows[0] as unknown as { id: string; user_id: string; actual: number; status: string; request_id: string };
  if (d.status !== "pending") return NextResponse.json({ ok: false, error: `Already ${d.status}` }, { status: 400 });
  if (action === "approve") {
    const amt = Number(actual) || d.actual;
    await db.execute({ sql: "UPDATE deposits SET status='confirmed', actual=?, admin_remark=? WHERE id=?", args: [amt, remark || "", id] });
    await db.execute({ sql: "UPDATE wallets SET principal=principal+? WHERE user_id=?", args: [amt, d.user_id] });
    await logLedger(d.user_id, "deposit_confirm", "principal", amt, d.request_id);
    await creditFirstRecharge(d.user_id, amt);
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "investment", `Deposit ${d.request_id} confirmed: ${amt.toFixed(2)} USDT`] });
    return NextResponse.json({ ok: true, approved: true });
  }
  await db.execute({ sql: "UPDATE deposits SET status='rejected', admin_remark=? WHERE id=?", args: [remark || "", id] });
  return NextResponse.json({ ok: true, rejected: true });
}
