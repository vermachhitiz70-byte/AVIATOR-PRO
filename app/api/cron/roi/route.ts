import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { planForAmount } from "@/lib/config";
import { creditRoiLevels, logLedger } from "@/lib/mlm";
import type { Campaign } from "@/lib/campaigns";

// Daily tier-based ROI cron (client business plan). Protect with ?secret=CRON_SECRET.
// For each active bot: tier daily% of amount -> roi wallet + 10-level ROI commissions.
// Enforces per-tier cap multiplier (2X–5X) on DIRECT ROI only — Direct Income and
// ROI-on-ROI level bonuses are OUT of capping (they credit the commission wallet,
// which total_earned never includes). 365-day auto-expiry. Idempotent per day.
export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}

async function run(req: NextRequest) {
  await initDb();
  const secret = new URL(req.url).searchParams.get("secret") || "";
  if (secret !== (process.env.CRON_SECRET || "dev-cron-secret")) {
    return NextResponse.json({ ok: false, error: "Bad secret. Set CRON_SECRET env and call /api/cron/roi?secret=..." }, { status: 401 });
  }
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const bots = await db.execute({ sql: "SELECT * FROM bots WHERE status='active'", args: [] });
  let paid = 0;
  let credited = 0;
  let capped = 0;
  let expired = 0;
  let skipped = 0;
  const byTier: Record<string, number> = {};
  for (const row of bots.rows) {
    const bot = row as unknown as { id: string; user_id: string; amount: number; total_earned: number; last_roi_date: string; expiry_date: string };
    if (bot.last_roi_date === today) continue; // idempotent
    if (bot.expiry_date && bot.expiry_date.slice(0, 10) < today) {
      await db.execute({ sql: "UPDATE bots SET status='expired' WHERE id=?", args: [bot.id] });
      expired++;
      continue;
    }
    const tier = planForAmount(Number(bot.amount));
    if (!tier) { skipped++; continue; } // amount outside all tiers ($10–$100,000)
    const roiPct = tier.dailyPct;
    let roi = (Number(bot.amount) * roiPct) / 100;
    const cap = Number(bot.amount) * tier.multiplier;
    const room = cap - Number(bot.total_earned);
    if (room <= 0) {
      await db.execute({ sql: "UPDATE bots SET status='capped' WHERE id=?", args: [bot.id] });
      capped++;
      continue;
    }
    if (roi > room) roi = room;
    const newTotal = Number(bot.total_earned) + roi;
    await db.execute({ sql: "UPDATE bots SET total_earned=?, last_roi_date=? WHERE id=?", args: [newTotal, today, bot.id] });
    await db.execute({ sql: "UPDATE wallets SET roi=roi+? WHERE user_id=?", args: [roi, bot.user_id] });
    await logLedger(bot.user_id, "daily_roi", "roi", roi, `bot ${bot.id} ${tier.name} @${roiPct}%`);
    if (roi > 0) await creditRoiLevels(bot.user_id, roi);
    if (newTotal >= cap) {
      await db.execute({ sql: "UPDATE bots SET status='capped' WHERE id=?", args: [bot.id] });
      capped++;
    }
    paid++;
    byTier[tier.name] = (byTier[tier.name] || 0) + 1;
    credited = Math.round((credited + roi) * 100) / 100;
  }
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "investment", `Daily ROI distributed to ${paid} bots (${credited.toFixed(2)} USDT)`] });
  // Nightly campaign evaluation for ROI recipients (achievements recorded once)
  let campChecked = 0;
  try {
    const { checkAndRecord } = await import("@/lib/campaigns");
    const camps = await db.execute({ sql: "SELECT * FROM campaigns WHERE status='active'", args: [] });
    const earners = await db.execute({ sql: "SELECT DISTINCT user_id FROM bots WHERE last_roi_date=?", args: [today] });
    for (const cRow of camps.rows) {
      const camp = cRow as unknown as Campaign;
      for (const eRow of earners.rows) {
        await checkAndRecord((eRow as unknown as { user_id: string }).user_id, camp);
        campChecked++;
      }
    }
  } catch { /* campaigns optional */ }
  return NextResponse.json({ ok: true, date: today, botsPaid: paid, totalCredited: credited, capped, expired, skipped, byTier, campChecked });
}
