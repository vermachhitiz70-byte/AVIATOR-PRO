import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { walletOf } from "@/lib/mlm";
import { WALLETS } from "@/lib/config";

// GET /api/wallets[?userId=] — balances + lifetime inflow per wallet + locked rules.
// userId only honored for admins (for the admin user-detail panel).
export async function GET(req: NextRequest) {
  await initDb();
  const me = await currentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  let uid = me.id as string;
  const q = new URL(req.url).searchParams.get("userId");
  if (q && q !== uid) {
    const { error } = await requireAdmin();
    if (error) return error;
    const chk = await getDb().execute({ sql: "SELECT id FROM users WHERE id=?", args: [q] });
    if (!chk.rows.length) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    uid = q;
  }
  const w = await walletOf(uid);
  const db = getDb();
  const life = await db.execute({
    sql: "SELECT wallet, COALESCE(SUM(CASE WHEN amount>0 THEN amount ELSE 0 END),0) as inflow FROM ledger WHERE user_id=? AND wallet IN ('principal','roi','commission','reward') GROUP BY wallet",
    args: [uid],
  });
  const inflow: Record<string, number> = { principal: 0, roi: 0, commission: 0, reward: 0 };
  for (const r of life.rows as unknown as { wallet: string; inflow: number }[]) inflow[r.wallet] = Number(r.inflow);
  return NextResponse.json({
    ok: true,
    wallets: WALLETS.map((d) => ({
      key: d.key,
      label: d.label,
      desc: d.desc,
      withdrawable: d.withdrawable,
      balance: Number((w as unknown as Record<string, number>)[d.key] ?? 0),
      lifetimeInflow: inflow[d.key] ?? 0,
    })),
  });
}
