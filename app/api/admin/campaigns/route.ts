import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_CRITERIA } from "@/lib/campaigns";

export async function GET() {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const c = await getDb().execute("SELECT * FROM campaigns ORDER BY rowid DESC");
  const a = await getDb().execute("SELECT * FROM campaign_achievers ORDER BY earned DESC LIMIT 100");
  return NextResponse.json({ ok: true, campaigns: c.rows, achievers: a.rows });
}

// POST { action: create|update|delete|deleteAchiever|clearDemo, ... }
export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const b = await req.json();
  const db = getDb();
  if (b.action === "create") {
    const id = uid("CAMP");
    await db.execute({
      sql: "INSERT INTO campaigns (id,name,location,meeting_date,eligibility_end,status,criteria_json) VALUES (?,?,?,?,?,?,?)",
      args: [id, b.name || "New Campaign", b.location || "", b.meeting_date || "", b.eligibility_end || "", b.status || "active", JSON.stringify(b.criteria || DEFAULT_CRITERIA)],
    });
    return NextResponse.json({ ok: true, id });
  }
  if (b.action === "update") {
    await db.execute({
      sql: "UPDATE campaigns SET name=?,location=?,meeting_date=?,eligibility_end=?,status=?,criteria_json=? WHERE id=?",
      args: [b.name, b.location, b.meeting_date, b.eligibility_end, b.status, typeof b.criteria === "string" ? b.criteria : JSON.stringify(b.criteria || DEFAULT_CRITERIA), b.id],
    });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "delete") {
    await db.execute({ sql: "DELETE FROM campaign_achievers WHERE campaign_id=?", args: [b.id] });
    await db.execute({ sql: "DELETE FROM campaigns WHERE id=?", args: [b.id] });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "deleteAchiever") {
    await db.execute({ sql: "DELETE FROM campaign_achievers WHERE id=?", args: [b.id] });
    return NextResponse.json({ ok: true });
  }
  if (b.action === "clearDemo") {
    await db.execute({ sql: "DELETE FROM campaign_achievers WHERE campaign_id=? AND is_demo=1", args: [b.id] });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
