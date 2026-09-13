import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

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
  if (status && status !== "all") { where += " AND w.status=?"; args.push(status); }
  if (from) { where += " AND date(w.created_at)>=?"; args.push(from); }
  if (to) { where += " AND date(w.created_at)<=?"; args.push(to); }
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR w.address LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT w.*, u.name, u.email, u.referral_code FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE ${where} ORDER BY w.rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, rows: (rows as unknown as { rows: Record<string, unknown>[] }).rows, total, page, limit });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const db = getDb();
  const { id, action, remark } = body;

  if (action === "approve") {
    await db.execute("UPDATE withdrawals SET status='approved', admin_remark=? WHERE id=?", [remark || "", id]);
    return NextResponse.json({ ok: true });
  }
  if (action === "reject") {
    const w = await db.execute({ sql: "SELECT * FROM withdrawals WHERE id=?", args: [id] });
    if (w.rows.length) {
      const row = w.rows[0] as unknown as { user_id: string; debit: number };
      await db.execute("UPDATE wallets SET principal=principal+? WHERE user_id=?", [row.debit, row.user_id]);
      await db.execute("UPDATE withdrawals SET status='rejected', admin_remark=? WHERE id=?", [remark || "", id]);
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
