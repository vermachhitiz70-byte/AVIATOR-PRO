import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Logged-in users: active announcements, newest first.
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await getDb().execute({ sql: "SELECT id,title,message,created_at FROM announcements WHERE is_active=1 ORDER BY rowid DESC LIMIT 5", args: [] });
  return NextResponse.json({ ok: true, rows: r.rows });
}
