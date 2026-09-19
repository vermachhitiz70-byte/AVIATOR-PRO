import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  let uid = u.id as string;
  const limit = Math.min(200, Math.max(1, Number(new URL(req.url).searchParams.get("limit") || 50)));
  const q = new URL(req.url).searchParams.get("userId");
  if (q && q !== uid) {
    const { error } = await requireAdmin();
    if (error) return error;
    uid = q;
  }
  const r = await getDb().execute({ sql: "SELECT kind,wallet,amount,note,created_at FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT ?", args: [uid, limit] });
  return NextResponse.json({ ok: true, rows: r.rows });
}
