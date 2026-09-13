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
  const plan = new URL(req.url).searchParams.get("plan") || "";
  const q = new URL(req.url).searchParams.get("q") || "";

  let where = "1=1";
  const args: (string | number)[] = [];
  if (status) { where += " AND b.status=?"; args.push(status); }
  if (userId) { where += " AND b.user_id=?"; args.push(userId); }
  if (plan) { where += " AND b.plan=?"; args.push(plan); }
  if (q) { where += " AND (u.name LIKE ? OR u.email LIKE ? OR u.mobile LIKE ? OR u.referral_code LIKE ?)"; args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM bots b JOIN users u ON b.user_id=u.id WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT b.*, u.name, u.email, u.referral_code FROM bots b JOIN users u ON b.user_id=u.id WHERE ${where} ORDER BY b.rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, rows: (rows as unknown as { rows: Record<string, unknown>[] }).rows, total, page, limit });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const db = getDb();

  if (body.action === "create") {
    const { userId, plan, amount, daily_pct, start_date, expiry_date } = body;
    if (!userId || !plan || !amount) return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    const userCheck = await db.execute({ sql: "SELECT id FROM users WHERE id=? OR referral_code=?", args: [userId, userId] });
    if (!userCheck.rows.length) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    const resolvedUserId = (userCheck.rows[0] as unknown as { id: string }).id;
    const id = `b-${Date.now()}`;
    await db.execute({ sql: "INSERT INTO bots (id,user_id,plan,amount,daily_pct,start_date,expiry_date,status) VALUES (?,?,?,?,?,?,?,?)", args: [id, resolvedUserId, plan, Number(amount), Number(daily_pct || 1), start_date || new Date().toISOString().split("T")[0], expiry_date || "", "active"] });
    return NextResponse.json({ ok: true, id });
  }
  if (body.action === "pause") {
    await db.execute({ sql: "UPDATE bots SET status='paused' WHERE id=?", args: [body.id] });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "resume") {
    await db.execute({ sql: "UPDATE bots SET status='active' WHERE id=?", args: [body.id] });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "cancel") {
    await db.execute({ sql: "UPDATE bots SET status='cancelled' WHERE id=?", args: [body.id] });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
