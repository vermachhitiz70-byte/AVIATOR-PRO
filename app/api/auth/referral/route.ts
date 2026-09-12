import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
export async function GET(req: NextRequest) {
  await initDb();
  const code = new URL(req.url).searchParams.get("code") || "";
  const r = await getDb().execute({ sql: "SELECT name,root_referral FROM users WHERE referral_code=?", args: [code] });
  if (!r.rows.length) return NextResponse.json({ ok: false });
  return NextResponse.json({ ok: true, name: (r.rows[0] as unknown as { name: string }).name, root: (r.rows[0] as unknown as { root_referral: string }).root_referral });
}
