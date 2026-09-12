import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { checkAndRecord, leaderboard, type Campaign } from "@/lib/campaigns";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const r = await getDb().execute({ sql: "SELECT * FROM campaigns WHERE id=?", args: [id] });
  if (!r.rows.length) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const camp = r.rows[0] as unknown as Campaign;
  const ev = await checkAndRecord(u.id as string, camp);
  const board = await leaderboard(id);
  return NextResponse.json({ ok: true, campaign: camp, ...ev, leaderboard: board });
}
