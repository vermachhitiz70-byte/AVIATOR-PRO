import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { getDb, initDb } from "./db";

const COOKIE = "av_session";

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
  // Kill any legacy host-only cookie first (a stale one would otherwise shadow
  // the fresh domain cookie — browsers send oldest first and we must not read it).
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  jar.set(COOKIE, token, cookieOpts(host));
  return token;
}
export async function destroySession(host?: string | null) {
  const jar = await cookies();
  // Clear BOTH variants (legacy host-only + domain-scoped), else one survives.
  jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  jar.set(COOKIE, "", { ...cookieOpts(host), maxAge: 0 });
}

// Read EVERY av_session cookie the browser sent (there can be two: a stale
// host-only one plus the fresh domain one). cookies().get() returns only the
// first — which is the oldest, i.e. usually the stale one. We parse raw.
async function readTokens(): Promise<string[]> {
  const out: string[] = [];
  try {
    const raw = (await headers()).get("cookie") || "";
    for (const part of raw.split(";")) {
      const i = part.indexOf("=");
      if (i < 0) continue;
      if (part.slice(0, i).trim() === COOKIE) {
        try { out.push(decodeURIComponent(part.slice(i + 1).trim())); } catch { /* skip malformed */ }
      }
    }
  } catch { /* ignore */ }
  if (!out.length) {
    try {
      const v = (await cookies()).get(COOKIE)?.value;
      if (v) out.push(v);
    } catch { /* ignore */ }
  }
  return out;
}
export async function currentUser() {
  try {
    await initDb();
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
