import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // Prefetch/prerender drive-bys must NEVER kill a session: only an explicit
  // user navigation (no prefetch headers) may log out via GET.
  const h = req.headers;
  const prefetch =
    h.get("next-router-prefetch") ||
    (h.get("sec-purpose") || "").toLowerCase().includes("prefetch") ||
    (h.get("sec-purpose") || "").toLowerCase().includes("prerender") ||
    (h.get("purpose") || "").toLowerCase() === "prefetch";
  if (prefetch) return NextResponse.json({ ok: true, prefetched: true });
  await destroySession(req.headers.get("host"));
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function POST(req: NextRequest) {
  await destroySession(req.headers.get("host"));
  return NextResponse.json({ ok: true });
}
