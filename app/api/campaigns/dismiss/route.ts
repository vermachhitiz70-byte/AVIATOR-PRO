import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// POST { campaign_id } – dismiss achievement toast
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const { campaign_id } = await req.json();
  await getDb().execute({ sql: "UPDATE campaign_achievers SET notified=1 WHERE campaign_id=? AND user_id=?", args: [campaign_id, u.id as string] });
  return NextResponse.json({ ok: true });
}
