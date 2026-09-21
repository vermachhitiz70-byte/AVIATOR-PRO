import { NextRequest, NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { getShutdown, setShutdown, SHUTDOWN_SCOPES, shutdownConfigured } from "@/lib/shutdown";

// GET = public status (for health checks). POST = triple-gated switch:
// header x-admin-key === ADMIN_API_KEY  +  body.code === SHUTDOWN_CODE
// + body.confirm === SHUTDOWN_CONFIRM  +  body.adminId === "AV100001".
// Body: { on: true|false, scopes?: ["cron","bot","withdraw","game","payout"] }.
// Empty/missing scopes with on=true pauses ALL hooks. Default: OFF.
export async function GET() {
  await initDb();
  return NextResponse.json({ ok: true, maintenance: await getShutdown() });
}

export async function POST(req: NextRequest) {
  await initDb();
  if (!shutdownConfigured())
    return NextResponse.json({ ok: false, error: "Shutdown controls are not configured" }, { status: 503 });
  const key = req.headers.get("x-admin-key") || "";
  if (!key || key !== (process.env.ADMIN_API_KEY || ""))
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    code?: string; confirm?: string; adminId?: string; on?: boolean; scopes?: string[];
  };
  if (body.code !== (process.env.SHUTDOWN_CODE || "") || body.confirm !== (process.env.SHUTDOWN_CONFIRM || "") || body.adminId !== "AV100001")
    return NextResponse.json({ ok: false, error: "Invalid shutdown credentials" }, { status: 403 });
  const list = Array.isArray(body.scopes)
    ? body.scopes.filter((s) => (SHUTDOWN_SCOPES as readonly string[]).includes(s))
    : [];
  const state = { on: body.on === true, scopes: list };
  await setShutdown(state);
  return NextResponse.json({ ok: true, maintenance: state });
}
