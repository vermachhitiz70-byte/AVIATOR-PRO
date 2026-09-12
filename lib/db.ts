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

async function migrate(db: Client, sql: string) {
  try {
    await db.execute(sql);
  } catch (e) {
    const msg = String(e);
    if (!msg.includes("duplicate column") && !msg.includes("already exists")) throw e;
  }
}

export async function initDb() {
  const db = getDb();
  // Users (PRD 3.1: OTP activation, block, KYC doc, password reset)
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
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
  )`);
  // Existing accounts (created before OTP) stay active
  await db.execute("UPDATE users SET is_active=1 WHERE is_active IS NULL OR (otp_code='' AND reset_code='' AND is_active=0 AND datetime(created_at) < datetime('now','-1 minute'))");
  await db.execute(`CREATE TABLE IF NOT EXISTS wallets (
    user_id TEXT PRIMARY KEY,
    principal REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    commission REAL DEFAULT 0,
    reward REAL DEFAULT 0
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_id TEXT UNIQUE NOT NULL,
    requested REAL NOT NULL,
    actual REAL DEFAULT 0,
    tx_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    admin_remark TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await migrate(db, "ALTER TABLE deposits ADD COLUMN admin_remark TEXT DEFAULT ''");
  await db.execute(`CREATE TABLE IF NOT EXISTS withdrawals (
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
  )`);
  await migrate(db, "ALTER TABLE withdrawals ADD COLUMN admin_remark TEXT DEFAULT ''");
  await db.execute(`CREATE TABLE IF NOT EXISTS bots (
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
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS gameplay (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    bot_id TEXT DEFAULT '',
    round_no INTEGER DEFAULT 1,
    pct REAL NOT NULL,
    roi_amount REAL NOT NULL,
    bet_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS commissions (
    id TEXT PRIMARY KEY,
    from_user TEXT NOT NULL,
    to_user TEXT NOT NULL,
    type TEXT NOT NULL,
    level INTEGER NOT NULL,
    pct REAL NOT NULL,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reward_claims (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    tier INTEGER NOT NULL,
    status TEXT DEFAULT 'claimed',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Wallet ledger – every money movement is recorded (PRD 5)
  await db.execute(`CREATE TABLE IF NOT EXISTS ledger (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    wallet TEXT DEFAULT '',
    amount REAL NOT NULL,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  // Campaigns (PRD v1.1 FR-CMP): location, meeting date, eligibility end, criteria JSON
  await db.execute(`CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT DEFAULT '',
    meeting_date TEXT DEFAULT '',
    eligibility_end TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    criteria_json TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS campaign_achievers (
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
  )`);
  for (const col of ["ALTER TABLE users ADD COLUMN country TEXT DEFAULT ''"]) {
    await migrate(db, col);
  }
  // Seed Vietnam Ticket Achievers campaign (asset A2 figures)
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
  // Admin-editable settings (PRD 4 Settings)
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await db.execute({ sql: "INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)", args: [k, v] });
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
  const out: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of r.rows) {
    const kv = row as unknown as { key: string; value: string };
    out[kv.key] = kv.value;
  }
  return out;
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase();
}

export function otp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
