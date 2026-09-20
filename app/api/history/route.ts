import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { buildTrail } from "@/lib/trail";

// GET /api/history — logged-in user's own full transaction history
// (deposits, bots, ROI, level, rewards, withdrawals), newest first.
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const trail = await buildTrail(u.id as string, getDb());
  if (!trail) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...trail });
}
