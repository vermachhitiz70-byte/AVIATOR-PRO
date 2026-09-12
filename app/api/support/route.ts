import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const r = await getDb().execute({ sql: "SELECT subject,message,status,created_at FROM support_tickets WHERE user_id=? ORDER BY rowid DESC LIMIT 20", args: [u.id as string] });
  return NextResponse.json({ ok: true, rows: r.rows });
}
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const { subject, message } = await req.json();
  if (!subject || !message) return NextResponse.json({ ok: false, error: "Required" }, { status: 400 });
  await getDb().execute({ sql: "INSERT INTO support_tickets (id,user_id,subject,message) VALUES (?,?,?,?)", args: [uid("S"), u.id as string, subject, message] });
  return NextResponse.json({ ok: true });
}
