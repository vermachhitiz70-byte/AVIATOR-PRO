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

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return token;
}
export async function destroySession() {
  (await cookies()).delete(COOKIE);
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
