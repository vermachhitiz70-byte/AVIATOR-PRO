import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, uid } from "@/lib/db";
import { planForAmount } from "@/lib/config";
import { creditRoiLevels, logLedger } from "@/lib/mlm";
import type { Campaign } from "@/lib/campaigns";

export const maxDuration = 60;

// Daily tier-based ROI cron (client business plan). Protect with ?secret=CRON_SECRET.
// For each active bot: tier daily% of amount -> roi wallet + 10-level ROI commissions.
// Enforces per-tier cap multiplier (2X–5X) on DIRECT ROI only — Direct Income and
// ROI-on-ROI level bonuses are OUT of capping (they credit the commission wallet,
// which total_earned never includes). 365-day auto-expiry. Idempotent per day.
// Bots are processed in parallel (concurrency-limited) so large user bases finish
// inside the serverless timeout; already-paid bots are skipped, so partial runs
// can simply be re-triggered to finish.
export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}

type BotRow = { id: string; user_id: string; amount: number; total_earned: number; last_roi_date: string; expiry_date: string };
type BotResult = { paid: boolean; credited: number; capped: boolean; expired: boolean; skipped: boolean; tier?: string };

async function processBot(bot: BotRow, today: string): Promise<BotResult> {
  const db = getDb();
  if (bot.last_roi_date === today) return { paid: false, credited: 0, capped: false, expired: false, skipped: true }; // idempotent
  if (bot.expiry_date && bot.expiry_date.slice(0, 10) < today) {
    await db.execute({ sql: "UPDATE bots SET status='expired' WHERE id=?", args: [bot.id] });
    return { paid: false, credited: 0, capped: false, expired: true, skipped: false };
  }
  const tier = planForAmount(Number(bot.amount));
  if (!tier) return { paid: false, credited: 0, capped: false, expired: false, skipped: true }; // amount outside all tiers ($10–$100,000)
  const roiPct = tier.dailyPct;
  let roi = (Number(bot.amount) * roiPct) / 100;
  const cap = Number(bot.amount) * tier.multiplier;
  const room = cap - Number(bot.total_earned);
  if (room <= 0) {
    await db.execute({ sql: "UPDATE bots SET status='capped' WHERE id=?", args: [bot.id] });
    return { paid: false, credited: 0, capped: true, expired: false, skipped: false };
  }
  if (roi > room) roi = room;
  const newTotal = Number(bot.total_earned) + roi;
  await db.execute({ sql: "UPDATE bots SET total_earned=?, last_roi_date=? WHERE id=?", args: [newTotal, today, bot.id] });
  await db.execute({ sql: "UPDATE wallets SET roi=roi+? WHERE user_id=?", args: [roi, bot.user_id] });
  await logLedger(bot.user_id, "daily_roi", "roi", roi, `bot ${bot.id} ${tier.name} @${roiPct}%`);
  if (roi > 0) await creditRoiLevels(bot.user_id, roi);
  if (newTotal >= cap) {
    await db.execute({ sql: "UPDATE bots SET status='capped' WHERE id=?", args: [bot.id] });
    return { paid: true, credited: roi, capped: true, expired: false, skipped: false, tier: tier.name };
  }
  return { paid: true, credited: roi, capped: false, expired: false, skipped: false, tier: tier.name };
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
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
  const results = await pool(bots.rows as unknown as BotRow[], 8, (b) => processBot(b, today));
  let paid = 0, credited = 0, capped = 0, expired = 0, skipped = 0;
  const byTier: Record<string, number> = {};
  for (const r of results) {
    if (r.paid) { paid++; credited = Math.round((credited + r.credited) * 100) / 100; if (r.tier) byTier[r.tier] = (byTier[r.tier] || 0) + 1; }
    if (r.capped) capped++;
    if (r.expired) expired++;
    if (r.skipped) skipped++;
  }
  await db.execute({ sql: "INSERT INTO activities (id,kind,message) VALUES (?,?,?)", args: [uid("A"), "investment", `Daily ROI distributed to ${paid} bots (${credited.toFixed(2)} USDT)`] });
  // Nightly campaign evaluation for ROI recipients (achievements recorded once;
  // distinct users, so parallel evaluation is safe)
  let campChecked = 0;
  try {
    const { checkAndRecord } = await import("@/lib/campaigns");
    const camps = await db.execute({ sql: "SELECT * FROM campaigns WHERE status='active'", args: [] });
    const earners = await db.execute({ sql: "SELECT DISTINCT user_id FROM bots WHERE last_roi_date=?", args: [today] });
    const jobs: { userId: string; camp: Campaign }[] = [];
    for (const cRow of camps.rows) {
      const camp = cRow as unknown as Campaign;
      for (const eRow of earners.rows) jobs.push({ userId: (eRow as unknown as { user_id: string }).user_id, camp });
    }
    await pool(jobs, 8, async ({ userId, camp }) => { await checkAndRecord(userId, camp); });
    campChecked = jobs.length;
  } catch { /* campaigns optional */ }
  return NextResponse.json({ ok: true, date: today, botsPaid: paid, totalCredited: credited, capped, expired, skipped, byTier, campChecked });
}
