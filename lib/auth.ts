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

async function cookieOpts() {
  const h = await headers();
  const host = (h.get("host") || "").toLowerCase();
  const isAviator = host.includes("aviatorsmartai.com");
  const isProd = process.env.NODE_ENV === "production";
  // On custom domain, share cookie between apex and www; on Vercel/system domains keep host-only.
  const domain = isAviator ? ".aviatorsmartai.com" : undefined;
  return {
    httpOnly: true as const,
    path: "/" as const,
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax" as const,
    secure: isProd,
    ...(domain ? { domain } : {}),
  };
}
export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, await cookieOpts());
  return token;
}
export async function destroySession() {
  const opts = await cookieOpts();
  // delete must match domain/path of the cookie we set
  const c = await cookies();
  c.delete({ name: COOKIE, path: opts.path, ...(opts.domain ? { domain: opts.domain } : {}) } as never);
  // also try host-only delete as fallback
  c.delete(COOKIE);
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
