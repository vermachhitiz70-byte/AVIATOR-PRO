import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// Admin: list all / create / toggle / delete announcements.
export async function GET() {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const r = await getDb().execute({ sql: "SELECT * FROM announcements ORDER BY rowid DESC LIMIT 50", args: [] });
  return NextResponse.json({ ok: true, rows: r.rows });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const { action, id, title, message } = await req.json();
  const db = getDb();
  if (action === "create") {
    if (!title || !message) return NextResponse.json({ ok: false, error: "Title + message required" }, { status: 400 });
    await db.execute({ sql: "INSERT INTO announcements (id,title,message) VALUES (?,?,?)", args: [uid("N"), String(title).slice(0, 120), String(message).slice(0, 2000)] });
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
  if (action === "delete") {
    await db.execute({ sql: "DELETE FROM announcements WHERE id=?", args: [id] });
    return NextResponse.json({ ok: true });
  }
  if (action === "toggle") {
    await db.execute({ sql: "UPDATE announcements SET is_active=CASE WHEN is_active=1 THEN 0 ELSE 1 END WHERE id=?", args: [id] });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
