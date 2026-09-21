import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { getDb, initDb, resetDb, withTimeout } from "./db";

const COOKIE = "av_session2";
const LEGACY_COOKIE = "av_session";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me-please-long");
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

// Session cookie must survive apex<->www hops: on the custom domain we scope
// it to `.aviatorsmartai.com` (shared by apex + www). Preview/local hosts
// keep a host-only cookie (browsers reject foreign Domain values).
function cookieOpts(host?: string | null) {
  const h = (host || "").split(":")[0].toLowerCase();
  const shared = h === "aviatorsmartai.com" || h.endsWith(".aviatorsmartai.com");
  return {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    ...(shared ? { domain: ".aviatorsmartai.com" } : {}),
  };
}

export async function createSession(userId: string, host?: string | null) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  const jar = await cookies();
  // Best-effort cleanup of every legacy cookie tuple (host-only + domain).
  jar.set(LEGACY_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  jar.set(LEGACY_COOKIE, "", { ...cookieOpts(host), maxAge: 0 });
  jar.set(COOKIE, token, cookieOpts(host));
  return token;
}
export async function destroySession(host?: string | null) {
  const jar = await cookies();
  jar.set(COOKIE, "", { ...cookieOpts(host), maxAge: 0 });
  jar.set(LEGACY_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  jar.set(LEGACY_COOKIE, "", { ...cookieOpts(host), maxAge: 0 });
}

// Read EVERY session cookie the browser sent. Name rotation (av_session ->
// av_session2) already strands stale jars, but we ALSO parse raw: browsers can
// send duplicate names (stale host-only + fresh domain), and cookies().get()
// returns only the first (oldest = stalest). Fresh name first, legacy fallback.
async function readTokens(): Promise<string[]> {
  const out: string[] = [];
  const pushName = (raw: string, name: string) => {
    for (const part of raw.split(";")) {
      const i = part.indexOf("=");
      if (i < 0) continue;
      if (part.slice(0, i).trim() === name) {
        try { out.push(decodeURIComponent(part.slice(i + 1).trim())); } catch { /* skip malformed */ }
      }
    }
  };
  try {
    const raw = (await headers()).get("cookie") || "";
    pushName(raw, COOKIE);
    pushName(raw, LEGACY_COOKIE);
  } catch { /* ignore */ }
  if (!out.length) {
    try {
      const v = (await cookies()).get(COOKIE)?.value || (await cookies()).get(LEGACY_COOKIE)?.value;
      if (v) out.push(v);
    } catch { /* ignore */ }
  }
  return out;
}
export async function currentUser() {
  // Hard bound: a half-dead socket must resolve to 503 (retry), NEVER hang.
  try {
    return await withTimeout(_currentUserInner(), 15000);
  } catch {
    resetDb();
    return null;
  }
}
async function _currentUserInner() {
  try {
    try {
      await withTimeout(initDb(), 12000);
    } catch {
      // One retry: a cold-start Turso blip must NEVER log a user out.
      // Drop a possibly sick cached client so the retry reconnects fresh.
      resetDb();
      await new Promise((r) => setTimeout(r, 800));
      await withTimeout(initDb(), 12000);
    }
    const tokens = await readTokens();
    if (!tokens.length) return null;
    const db = getDb();
    // Try each cookie value until one verifies (stale/expired values skipped).
    for (const token of tokens) {
      try {
        const { payload } = await jwtVerify(token, secret());
        const r = await db.execute({ sql: "SELECT id,name,first_name,last_name,mobile,email,country,referral_code,referred_by,root_referral,rank,is_admin,is_active,is_blocked,kyc_status,kyc_doc,bep20_address,aadhaar,pan,address FROM users WHERE id=?", args: [payload.uid as string] });
        if (r.rows.length > 0) return r.rows[0] as unknown as Record<string, unknown>;
      } catch { /* try next cookie value */ }
    }
    return null;
  } catch {
    return null;
  }
}

export function nextReferralCode() {
  const n = 100002 + Math.floor(Math.random() * 899997);
  return `AV${n}`;
}

// Session status for API routes: "none" = no/invalid token (→ 401, go login),
// "error" = signature valid but DB unreadable right now (→ 503, safe to retry),
// "valid" = logged in. Lets client pages NEVER bounce a live session to
// /login on a transient DB blip.
export async function sessionStatus(): Promise<"valid" | "none" | "error"> {
  const tokens = await readTokens();
  if (!tokens.length) return "none";
  let uid: string | null = null;
  for (const t of tokens) {
    try {
      const { payload } = await jwtVerify(t, secret());
      uid = String(payload.uid || "");
      break;
    } catch { /* try next cookie value */ }
  }
  if (!uid) return "none";
  try {
    await withTimeout(initDb(), 12000);
    const r = await withTimeout(getDb().execute({ sql: "SELECT id FROM users WHERE id=?", args: [uid] }), 12000);
    return r.rows.length ? "valid" : "none";
  } catch {
    resetDb();
    return "error";
  }
}
