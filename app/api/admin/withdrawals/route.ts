import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { logLedger } from "@/lib/mlm";

// GET ?status=pending|approved|rejected|all
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const status = new URL(req.url).searchParams.get("status") || "pending";
  const sql = status === "all"
    ? "SELECT w.*,u.name,u.email FROM withdrawals w LEFT JOIN users u ON u.id=w.user_id ORDER BY w.rowid DESC LIMIT 100"
    : "SELECT w.*,u.name,u.email FROM withdrawals w LEFT JOIN users u ON u.id=w.user_id WHERE w.status=? ORDER BY w.rowid DESC LIMIT 100";
  const r = await getDb().execute(status === "all" ? sql : { sql, args: [status] });
  return NextResponse.json({ ok: true, rows: r.rows });
}

// POST { id, action: approve|reject, remark? } – reject refunds debit to principal
export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { id, action, remark } = await req.json();
  const db = getDb();
  const r = await db.execute({ sql: "SELECT * FROM withdrawals WHERE id=?", args: [id] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const w = r.rows[0] as unknown as { id: string; user_id: string; debit: number; net: number; status: string };
  if (w.status !== "pending") return NextResponse.json({ ok: false, error: `Already ${w.status}` }, { status: 400 });
  if (action === "approve") {
    await db.execute({ sql: "UPDATE withdrawals SET status='approved', admin_remark=? WHERE id=?", args: [remark || "", id] });
    await logLedger(w.user_id, "withdraw_approve", "", -w.debit, `paid net ${Number(w.net).toFixed(2)}`);
    await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "withdrawal", `Withdrawal of ${Number(w.net).toFixed(2)} USDT paid`] });
    return NextResponse.json({ ok: true, approved: true });
  }
  await db.execute({ sql: "UPDATE withdrawals SET status='rejected', admin_remark=? WHERE id=?", args: [remark || "", id] });
  await db.execute({ sql: "UPDATE wallets SET principal=principal+? WHERE user_id=?", args: [w.debit, w.user_id] });
  await logLedger(w.user_id, "withdraw_refund", "principal", w.debit, "rejected by admin");
  return NextResponse.json({ ok: true, rejected: true, refunded: w.debit });
}
