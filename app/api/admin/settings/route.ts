import { NextRequest, NextResponse } from "next/server";
import { getDb, getSettings, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET all settings | POST { key, value } or { all: {...} }
export async function GET() {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ ok: true, settings: await getSettings() });
}

export async function POST(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const body = await req.json();
  const db = getDb();
  const pairs: [string, string][] = body.all ? Object.entries(body.all) : [[body.key, body.value]];
  for (const [k, v] of pairs) {
    if (typeof v !== "string") continue;
    await db.execute({ sql: "INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", args: [k, v] });
  }
  return NextResponse.json({ ok: true, settings: await getSettings() });
}
