import { createClient, type Client } from "@libsql/client";
import { DEFAULT_SETTINGS } from "./config";

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL || "file:./local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
  client = createClient({ url, authToken });
  return client;
}

// Drop the cached client so the next getDb() reconnects fresh. A dead
// Hrana socket stays dead forever if cached — that single sick instance
// then fails EVERY auth check (false "logged out") until recycled.
export function resetDb(): void {
  try { void client?.close(); } catch { /* ignore */ }
  client = null;
}

// Race any DB promise against a timer. Remote sockets can go half-dead:
// no error, just silence — without this the serverless function hangs to
// maxDuration and the user sees "server taking too long". A timeout throws,
// letting callers resetDb()+retry and answer 503 (fast) instead of hanging.
export const DB_TIMEOUT_MS = 12000;
export async function withTimeout<T>(p: Promise<T>, ms = DB_TIMEOUT_MS): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, rej) => {
        t = setTimeout(() => rej(new Error("db-timeout")), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function migrate(db: Client, sql: string) {
  try {
    await db.execute(sql);
  } catch (e) {
    const msg = String(e);
    if (!msg.includes("duplicate column") && !msg.includes("already exists")) throw e;
  }
}

// Schema version: bump when migrateAll() changes. The DB stores its version in
// meta; matching versions skip ALL migrations (1 roundtrip). Without this gate
// every serverless cold start replayed ~20 migration statements (~5s cross-region).
const SCHEMA_VERSION = "10";

// Cached per server instance: concurrent requests share one migration run,
// warm instances skip it entirely.
let ready: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!ready) ready = ensure().catch((e) => { ready = null; throw e; });
  return ready;
}

async function ensure(): Promise<void> {
  const db = getDb();
  const meta = await db.batch([
    { sql: "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)", args: [] },
    { sql: "SELECT value FROM meta WHERE key='schema_version'", args: [] },
  ]);
  const v = (meta[1].rows[0] as unknown as { value: string } | undefined)?.value;
  if (v === SCHEMA_VERSION) return;
  await migrateAll();
  await db.execute({ sql: "INSERT OR REPLACE INTO meta (key,value) VALUES ('schema_version',?)", args: [SCHEMA_VERSION] });
}

async function migrateAll(): Promise<void> {
  const db = getDb();
  // Batch 1: core tables (independent — run in parallel)
  await Promise.all([
    db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by TEXT,
    root_referral TEXT DEFAULT 'ROOT0001',
    bep20_address TEXT DEFAULT '',
    kyc_status TEXT DEFAULT 'pending',
    kyc_doc TEXT DEFAULT '',
    rank TEXT DEFAULT 'Starter',
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    otp_code TEXT DEFAULT '',
    otp_expiry TEXT DEFAULT '',
    reset_code TEXT DEFAULT '',
    reset_expiry TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY,
    principal REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    commission REAL DEFAULT 0,
    reward REAL DEFAULT 0
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_id TEXT UNIQUE NOT NULL,
    requested REAL NOT NULL,
    actual REAL DEFAULT 0,
    tx_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    admin_remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source_wallet TEXT DEFAULT 'principal',
    usd REAL NOT NULL,
    debit REAL NOT NULL,
    charge REAL NOT NULL,
    net REAL NOT NULL,
    address TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    admin_remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    amount REAL NOT NULL,
    daily_pct REAL NOT NULL,
    start_date TEXT DEFAULT (datetime('now')),
    expiry_date TEXT NOT NULL,
    total_earned REAL DEFAULT 0,
    last_roi_date TEXT DEFAULT '',
    status TEXT DEFAULT 'active'
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS gameplay (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bot_id TEXT DEFAULT '',
    round_no INTEGER DEFAULT 1,
    pct REAL NOT NULL,
    roi_amount REAL NOT NULL,
    bet_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`),
  ]);
  // Batch 2: remaining tables (independent — run in parallel)
  await Promise.all([
    db.execute(`CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    type TEXT NOT NULL,
    level INTEGER NOT NULL,
    pct REAL NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS reward_claims (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    status TEXT DEFAULT 'claimed',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    // Wallet ledger – every money movement is recorded (PRD 5)
    db.execute(`CREATE TABLE IF NOT EXISTS ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    wallet TEXT DEFAULT '',
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    // Campaigns (PRD v1.1 FR-CMP): location, meeting date, eligibility end, criteria JSON
    db.execute(`CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT DEFAULT '',
    meeting_date TEXT DEFAULT '',
    eligibility_end TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    criteria_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  )`),
    db.execute(`CREATE TABLE IF NOT EXISTS campaign_achievers (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL,
    user_id TEXT DEFAULT '',
    name TEXT NOT NULL,
    country TEXT DEFAULT '',
    user_code TEXT DEFAULT '',
    earned REAL DEFAULT 0,
    is_demo INTEGER DEFAULT 0,
    notified INTEGER DEFAULT 0,
    achieved_at TEXT DEFAULT (datetime('now'))
  )`),
    // Admin-editable settings (PRD 4 Settings)
    db.execute(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`),
  ]);
  // Batch 3: column backfills + legacy activation (independent — run in parallel)
  await Promise.all([
    migrate(db, "ALTER TABLE deposits ADD COLUMN admin_remark TEXT DEFAULT ''"),
    migrate(db, "ALTER TABLE deposits ADD COLUMN screenshot_url TEXT DEFAULT ''"),
    migrate(db, "ALTER TABLE withdrawals ADD COLUMN admin_remark TEXT DEFAULT ''"),
    migrate(db, "ALTER TABLE users ADD COLUMN country TEXT DEFAULT ''"),
    migrate(db, "ALTER TABLE support_tickets ADD COLUMN admin_reply TEXT DEFAULT ''"),
    // Existing accounts (created before OTP) stay active
    db.execute("UPDATE users SET is_active=1 WHERE is_active IS NULL OR (otp_code='' AND reset_code='' AND is_active=0 AND datetime(created_at) < datetime('now','-1 minute'))"),
    ...Object.entries(DEFAULT_SETTINGS).map(([k, v]) =>
      db.execute({ sql: "INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)", args: [k, v] })
    ),
    // Withdrawal min follows client spec ($2). Only flips the old $24 seed
    // default back — never touches real admin customizations.
    db.execute("UPDATE settings SET value='2' WHERE key='minWithdrawal' AND value='24'"),
    // Withdrawal window moved to 08:00–10:00 IST (only where still old default).
    db.execute("UPDATE settings SET value='08:00' WHERE key='withdrawStartIST' AND value='07:00'"),
    db.execute("INSERT OR IGNORE INTO settings (key,value) VALUES ('maxWithdrawal','25000')"),
    // Deposit address was seeded as placeholder once — heal it (only placeholder/empty, never admin custom).
    db.execute("UPDATE settings SET value='0xf41A2fEEC860e0164416cB5D5B0c580881628507' WHERE key='depositAddress' AND (value='' OR value LIKE '%YOUR%')"),
    // Orphan rule: every non-admin user with NULL/empty referred_by becomes admin's direct (AV100001 sponsors).
    db.execute("UPDATE users SET referred_by='AV100001' WHERE (referred_by IS NULL OR referred_by='') AND referral_code!='AV100001'"),
    // Search/tree speed (re-runnable, IF NOT EXISTS).
    db.execute("CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_users_referred ON users(referred_by)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON ledger(user_id,created_at)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_deposits_user_status ON deposits(user_id,status)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_comm_to ON commissions(to_user,type)"),
    db.execute("CREATE INDEX IF NOT EXISTS idx_bots_user ON bots(user_id,status)"),
    // Milestone double-claim guard, step 1: drop legacy duplicate rows (keep earliest)
    db.execute("DELETE FROM reward_claims WHERE rowid NOT IN (SELECT MIN(rowid) FROM reward_claims GROUP BY user_id,tier)"),
  ]);
  // Step 2 (sequential, AFTER dedupe): one row per user+tier, forever
  await migrate(db, "CREATE UNIQUE INDEX idx_claim_once ON reward_claims(user_id,tier)");
  await db.execute(`CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await migrate(db, "ALTER TABLE withdrawals ADD COLUMN payout_tx TEXT DEFAULT ''");
  // Full profile + KYC-data columns (text only, no images) + OTP-gated change drafts
  await migrate(db, "ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''");
  await migrate(db, "ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''");
  await migrate(db, "ALTER TABLE users ADD COLUMN aadhaar TEXT DEFAULT ''");
  await migrate(db, "ALTER TABLE users ADD COLUMN pan TEXT DEFAULT ''");
  await migrate(db, "ALTER TABLE users ADD COLUMN address TEXT DEFAULT ''");
  await migrate(db, "ALTER TABLE users ADD COLUMN profile_pending TEXT DEFAULT ''");
  // Purge dead "0 bots" broadcast lines (user panels never show them again)
  await db.execute("DELETE FROM activities WHERE message LIKE 'Daily ROI distributed to 0 bots%'");
  // Seeds (run once ever — guarded by existence checks)
  const camp = await db.execute({ sql: "SELECT id FROM campaigns WHERE name='Vietnam Ticket Achievers'", args: [] });
  if (camp.rows.length === 0) {
    const cid = "camp-vietnam-1";
    const criteria = {
      kpis: [
        { key: "leadershipSelf", label: "Leadership Self", target: 10000 },
        { key: "teamL2_10", label: "L2–L10 Team Business", target: 100000 },
        { key: "direct", label: "Direct Business", target: 100000 },
        { key: "selfCriteria", label: "Self Criteria", target: 10000 },
      ],
      leadership: { self: 1000, teamL2_10: 10000, direct: 10000 },
      selfPath: { self: 10000, direct: 10000 },
    };
    await db.execute({
      sql: "INSERT INTO campaigns (id,name,location,meeting_date,eligibility_end,status,criteria_json) VALUES (?,?,?,?,?,?,?)",
      args: [cid, "Vietnam Ticket Achievers", "Vietnam", "2026-12-20", "2026-11-30", "active", JSON.stringify(criteria)],
    });
    const demo: [string, string, string, number][] = [
      ["Ethan Brooks", "US", "AV900101", 124420],
      ["Omar Haddad", "UAE", "AV900102", 108950],
      ["Maya Petrova", "UK", "AV900103", 65580],
      ["Amelia Brown", "UK", "AV900104", 57560],
      ["Priya Nair", "India", "AV900105", 44275],
    ];
    for (const [name, country, code, earned] of demo) {
      await db.execute({
        sql: "INSERT INTO campaign_achievers (id,campaign_id,user_id,name,country,user_code,earned,is_demo,notified) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [uid("CA"), cid, "", name, country, code, earned, 1, 1],
      });
    }
  }
  // Seed root demo user + admin if missing
  const root = await db.execute({ sql: "SELECT id FROM users WHERE referral_code='AV100001'", args: [] });
  if (root.rows.length === 0) {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin123!", 10);
    const adminId = "u-admin-root";
    await db.execute({
      sql: "INSERT INTO users (id,name,mobile,email,password_hash,referral_code,referred_by,root_referral,rank,is_admin,is_active) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      args: [adminId, "Demo User", "9000000001", process.env.ADMIN_EMAIL || "admin@aviatorpro.local", hash, "AV100001", null, "ROOT0001", "Admin", 1, 1],
    });
    await db.execute({ sql: "INSERT INTO wallets (user_id,principal,roi,commission,reward) VALUES (?,?,0,0,0)", args: [adminId, 0] });
  }
}

export async function getSettings(): Promise<Record<string, string>> {
  const db = getDb();
  const r = await db.execute("SELECT key,value FROM settings");
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of r.rows) {
    const kv = row as unknown as { key: string; value: string };
    out[kv.key] = kv.value;
  }
  return out as Record<string, string>;
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
}

export function otp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
