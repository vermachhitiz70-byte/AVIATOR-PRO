import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser, sessionStatus } from "@/lib/auth";
import { buildTrail } from "@/lib/trail";

// GET /api/history — logged-in user's own full transaction history
// (deposits, bots, ROI, level, rewards, withdrawals), newest first.
// 401 = truly logged out. 503 = transient hiccup (client retries, no logout).
export async function GET() {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  try {
    const trail = await buildTrail(u.id as string, getDb());
    if (!trail) return NextResponse.json({ ok: false }, { status: 401 });
    return NextResponse.json({ ok: true, ...trail });
  } catch {
    return NextResponse.json({ ok: false, transient: true }, { status: 503 });
  }
}
