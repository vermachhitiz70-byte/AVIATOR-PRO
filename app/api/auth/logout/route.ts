import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await destroySession(req.headers.get("host"));
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function POST(req: NextRequest) {
  await destroySession(req.headers.get("host"));
  return NextResponse.json({ ok: true });
}
