import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u || !u.is_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const db = getDb();
  const users = await db.execute("SELECT COUNT(*) as c FROM users");
  const deps = await db.execute("SELECT COUNT(*) as c FROM deposits");
  const wds = await db.execute("SELECT COUNT(*) as c FROM withdrawals");
  const bots = await db.execute("SELECT COUNT(*) as c FROM bots");
  const pend = await db.execute("SELECT id,user_id,net FROM withdrawals WHERE status='pending' ORDER BY rowid DESC LIMIT 20");
  return NextResponse.json({
    users: (users.rows[0] as unknown as { c: number }).c,
    deposits: (deps.rows[0] as unknown as { c: number }).c,
    withdrawals: (wds.rows[0] as unknown as { c: number }).c,
    bots: (bots.rows[0] as unknown as { c: number }).c,
    pendingWithdrawals: pend.rows,
  });
}
