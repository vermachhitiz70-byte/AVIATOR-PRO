import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

// GET /api/admin/lookup?q= — exact member search for admin pages.
// Priority: referral code exact → mobile exact → name exact (case-insensitive).
// Returns up to 10 matches with match type for disambiguation. Admin only.
export async function GET(req: NextRequest) {
  await initDb();
  const { error } = await requireAdmin();
  if (error) return error;
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ ok: true, rows: [] });
  const db = getDb();
  const out: { id: string; name: string; email: string; mobile: string; referral_code: string; match: string }[] = [];
  const seen = new Set<string>();
  const push = (rows: Record<string, unknown>[], match: string) => {
    for (const r of rows) {
      const id = String(r.id);
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ id, name: String(r.name ?? ""), email: String(r.email ?? ""), mobile: String(r.mobile ?? ""), referral_code: String(r.referral_code ?? ""), match });
    }
  };
  const byCode = await db.execute({ sql: "SELECT id,name,email,mobile,referral_code FROM users WHERE referral_code=? LIMIT 10", args: [q] });
  push(byCode.rows as unknown as Record<string, unknown>[], "referral code");
  if (out.length < 10) {
    const byMobile = await db.execute({ sql: "SELECT id,name,email,mobile,referral_code FROM users WHERE mobile=? LIMIT 10", args: [q] });
    push(byMobile.rows as unknown as Record<string, unknown>[], "mobile");
  }
  if (out.length < 10) {
    const byName = await db.execute({ sql: "SELECT id,name,email,mobile,referral_code FROM users WHERE LOWER(name)=LOWER(?) LIMIT 10", args: [q] });
    push(byName.rows as unknown as Record<string, unknown>[], "name");
  }
  return NextResponse.json({ ok: true, rows: out.slice(0, 10) });
}
