import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { unnotified } from "@/lib/campaigns";

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await getDb().execute({ sql: "SELECT id,name,location,meeting_date,eligibility_end,status FROM campaigns ORDER BY rowid DESC", args: [] });
  const fresh = await unnotified(u.id as string);
  return NextResponse.json({ ok: true, rows: r.rows, fresh });
}
