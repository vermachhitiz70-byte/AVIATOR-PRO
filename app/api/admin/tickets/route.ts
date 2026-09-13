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
  const userId = new URL(req.url).searchParams.get("userId") || "";
  const q = new URL(req.url).searchParams.get("q") || "";

  let where = "1=1";
  const args: (string | number)[] = [];
  if (status) { where += " AND st.status=?"; args.push(status); }
  if (userId) { where += " AND st.user_id=?"; args.push(userId); }
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR st.subject LIKE ? OR st.message LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM support_tickets st JOIN users u ON st.user_id=u.id WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT st.*, u.name, u.email, u.referral_code FROM support_tickets st JOIN users u ON st.user_id=u.id WHERE ${where} ORDER BY st.rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, rows: (rows as unknown as { rows: Record<string, unknown>[] }).rows, total, page, limit });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const db = getDb();
  const { action, id, reply, status: newStatus } = body;

  if (action === "reply") {
    await db.execute({ sql: "UPDATE support_tickets SET status='pending', admin_reply=? WHERE id=?", args: [reply, id] });
  } else if (action === "close") {
    await db.execute({ sql: "UPDATE support_tickets SET status='closed' WHERE id=?", args: [id] });
  } else if (action === "delete") {
    await db.execute({ sql: "DELETE FROM support_tickets WHERE id=?", args: [id] });
  } else if (action === "status") {
    await db.execute({ sql: "UPDATE support_tickets SET status=? WHERE id=?", args: [newStatus, id] });
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
