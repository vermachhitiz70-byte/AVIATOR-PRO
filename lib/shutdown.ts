import { getDb } from "./db";

// Graceful RED shutdown: master switch in DB meta (default OFF — normal operation).
// When ON with empty scopes, ALL hooks pause. With scopes, only those pause.
// Dashboard, login, history, team stay ON always — sirf earning/money hooks rukte hain.
export type ShutdownState = { on: boolean; scopes: string[] };
export const SHUTDOWN_SCOPES = ["cron", "bot", "withdraw", "game", "payout"] as const;

let cache: { at: number; state: ShutdownState } | null = null;

export async function getShutdown(): Promise<ShutdownState> {
  if (cache && Date.now() - cache.at < 10000) return cache.state;
  try {
    const db = getDb();
    const r = await db.execute({ sql: "SELECT value FROM meta WHERE key='shutdown'", args: [] });
    const raw = (r.rows[0] as unknown as { value: string } | undefined)?.value;
    const state: ShutdownState = raw ? (JSON.parse(raw) as ShutdownState) : { on: false, scopes: [] };
    cache = { at: Date.now(), state };
    return state;
  } catch {
    return { on: false, scopes: [] };
  }
}

export async function setShutdown(state: ShutdownState): Promise<void> {
  const db = getDb();
  await db.execute({ sql: "INSERT OR REPLACE INTO meta (key,value) VALUES ('shutdown',?)", args: [JSON.stringify(state)] });
  cache = { at: Date.now(), state };
}

export async function isKilled(scope: string): Promise<boolean> {
  const s = await getShutdown();
  if (!s.on) return false;
  if (!s.scopes || s.scopes.length === 0) return true;
  return s.scopes.includes(scope);
}

// Fail closed: without all three envs the switch can never be flipped.
export function shutdownConfigured(): boolean {
  return Boolean(process.env.ADMIN_API_KEY && process.env.SHUTDOWN_CODE && process.env.SHUTDOWN_CONFIRM);
}
