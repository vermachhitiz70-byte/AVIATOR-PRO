import { NextResponse } from "next/server";
import { currentUser } from "./auth";

export async function requireAdmin() {
  const u = await currentUser();
  if (!u) return { error: NextResponse.json({ error: "Login required" }, { status: 401 }) };
  if (!u.is_admin) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { user: u };
}
