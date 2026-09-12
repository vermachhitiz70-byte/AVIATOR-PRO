import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await getDb().execute({ sql: "SELECT kind,wallet,amount,note,created_at FROM ledger WHERE user_id=? ORDER BY rowid DESC LIMIT 50", args: [u.id as string] });
  return NextResponse.json({ ok: true, rows: r.rows });
}
