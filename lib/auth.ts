import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
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
  (await cookies()).set(COOKIE, token, cookieOpts(host));
  return token;
}
export async function destroySession(host?: string | null) {
  (await cookies()).set(COOKIE, "", { ...cookieOpts(host), maxAge: 0 });
}
export async function currentUser() {
  try {
    await initDb();
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    const db = getDb();
    const r = await db.execute({ sql: "SELECT id,name,mobile,email,country,referral_code,referred_by,root_referral,rank,is_admin,is_active,is_blocked,kyc_status,kyc_doc,bep20_address FROM users WHERE id=?", args: [payload.uid as string] });
    if (r.rows.length === 0) return null;
    return r.rows[0] as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function nextReferralCode() {
  const n = 100002 + Math.floor(Math.random() * 899997);
  return `AV${n}`;
}
