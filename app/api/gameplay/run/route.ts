import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";
import { currentUser, sessionStatus } from "@/lib/auth";

// DUMMY Aviator game is view-only: rounds auto-play on screen,
// no bets accepted, zero money moves anywhere.
export async function POST() {
  await initDb().catch(() => {});
  const st = await sessionStatus();
  if (st === "none") return NextResponse.json({ ok: false, error: "Login required" }, { status: 401 });
  if (st === "error") return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false, error: "Server hiccup. Please retry.", transient: true }, { status: 503 });
  if ((u as unknown as { is_blocked: number }).is_blocked)
    return NextResponse.json({ ok: false, error: "Your ID is suspended. Contact admin to unsuspend." }, { status: 403 });
  return NextResponse.json({ ok: false, error: "Demo viewing only — rounds play automatically" }, { status: 400 });
}
