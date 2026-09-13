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
  const kind = new URL(req.url).searchParams.get("kind") || "";
  const q = new URL(req.url).searchParams.get("q") || "";

  let where = "1=1";
  const args: (string | number)[] = [];
  if (kind) { where += " AND kind=?"; args.push(kind); }
  if (q) { where += " AND message LIKE ?"; args.push(`%${q}%`); }

  const countResult = await db.execute({ sql: `SELECT COUNT(*) as c FROM activities WHERE ${where}`, args });
  const total = Number((countResult.rows[0] as unknown as { c: number }).c);
  const rows = await db.execute({ sql: `SELECT * FROM activities WHERE ${where} ORDER BY rowid DESC LIMIT ? OFFSET ?`, args: [...args, limit, offset] });
  return NextResponse.json({ ok: true, rows: (rows as unknown as { rows: Record<string, unknown>[] }).rows, total, page, limit });
}
