import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const { bep20_address, country } = await req.json();
  if (bep20_address !== undefined) {
    if (bep20_address && !bep20_address.startsWith("0x")) return NextResponse.json({ ok: false, error: "Invalid BEP-20 address" }, { status: 400 });
    await getDb().execute({ sql: "UPDATE users SET bep20_address=? WHERE id=?", args: [bep20_address || "", u.id as string] });
  }
  if (country !== undefined) {
    await getDb().execute({ sql: "UPDATE users SET country=? WHERE id=?", args: [String(country).slice(0, 60), u.id as string] });
  }
  return NextResponse.json({ ok: true });
}
