import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb, otp6 } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Profile: permanent record (name, contacts, payout address, KYC data).
// - Plain fields (name/country/KYC-data) save directly, forever.
// - Sensitive fields (email, mobile, BEP20) change only with email-OTP:
//   request_otp -> OTP mailed -> confirm_otp applies it. Without OTP the old
//   value stays — nothing half-saved.
const OTP_FIELDS = ["email", "mobile", "bep20_address"] as const;

const clean = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validMobile = (v: string) => /^\+?[0-9]{6,15}$/.test(v.replace(/[\s-]/g, ""));
const validBep = (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v);

function validateField(field: string, value: string): string | null {
  if (field === "email" && !validEmail(value)) return "Invalid email address";
  if (field === "mobile" && !validMobile(value)) return "Invalid mobile number";
  if (field === "bep20_address" && !validBep(value)) return "BEP20 must be 0x + 40 hex chars";
  return null;
}

export async function GET() {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const { password_hash: _ph, otp_code: _oc, otp_expiry: _oe, reset_code: _rc, reset_expiry: _re, profile_pending: _pp, ...safe } = u as unknown as Record<string, unknown>;
  return NextResponse.json({ ok: true, user: safe });
}

export async function POST(req: NextRequest) {
  await initDb();
  const u = await currentUser();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });
  const uid = u.id as string;
  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const { action } = body;

  // ---- direct-save fields (permanent, no OTP) ----
  if (action === "save") {
    const first = clean(body.first_name, 40);
    const last = clean(body.last_name, 40);
    const country = clean(body.country, 60);
    const address = clean(body.address, 200);
    // Aadhaar/PAN removed from profile (client rule): keep stored values untouched.
    const name = `${first} ${last}`.trim() || String((u as unknown as { name: string }).name || "");
    await db.execute({ sql: "UPDATE users SET first_name=?,last_name=?,name=?,country=?,address=? WHERE id=?", args: [first, last, name.slice(0, 80), country, address, uid] });
    return NextResponse.json({ ok: true, saved: true });
  }

  // ---- OTP-gated fields: step 1 — send OTP ----
  if (action === "request_otp") {
    const field = String(body.field || "");
    const value = clean(body.value, 120);
    if (!(OTP_FIELDS as readonly string[]).includes(field)) return NextResponse.json({ ok: false, error: "Bad field" }, { status: 400 });
    const err = validateField(field, value);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
    if (field === "email" || field === "mobile") {
      const col = field === "email" ? "email" : "mobile";
      const dup = await db.execute({ sql: `SELECT id FROM users WHERE ${col}=? AND id!=?`, args: [value, uid] });
      if (dup.rows.length) return NextResponse.json({ ok: false, error: `${field === "email" ? "Email" : "Mobile"} already in use` }, { status: 400 });
    }
    const otp = otp6();
    const expiry = new Date(Date.now() + 10 * 60000).toISOString();
    await db.execute({ sql: "UPDATE users SET otp_code=?,otp_expiry=?,profile_pending=? WHERE id=?", args: [otp, expiry, JSON.stringify({ field, value }), uid] });
    // OTP goes to the NEW email for email-changes (ownership proof), else current email
    const to = field === "email" ? value : String((u as unknown as { email: string }).email || "");
    try {
      const { sendOtpEmail } = await import("@/lib/mail");
      await sendOtpEmail(to, otp, "notice");
    } catch (e) {
      if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Email service unavailable — try later" }, { status: 502 });
      return NextResponse.json({ ok: true, needOtp: true, devOtp: otp });
    }
    return NextResponse.json({ ok: true, needOtp: true, sentTo: to.replace(/(?<=^.).*(?=@)/, "***") });
  }

  // ---- OTP-gated fields: step 2 — verify + apply ----
  if (action === "confirm_otp") {
    const otp = String(body.otp || "").trim();
    const r = await db.execute({ sql: "SELECT otp_code,otp_expiry,profile_pending FROM users WHERE id=?", args: [uid] });
    const row = r.rows[0] as unknown as { otp_code: string; otp_expiry: string; profile_pending: string } | undefined;
    let pend: { field: string; value: string } | null = null;
    try { pend = JSON.parse(row?.profile_pending || "null"); } catch { pend = null; }
    if (!row?.otp_code || !pend || row.otp_code !== otp) return NextResponse.json({ ok: false, error: "Invalid OTP" }, { status: 400 });
    if (row.otp_expiry && new Date(row.otp_expiry).getTime() < Date.now()) return NextResponse.json({ ok: false, error: "OTP expired — request a new one" }, { status: 400 });
    const err = validateField(pend.field, pend.value);
    if (err) return NextResponse.json({ ok: false, error: err }, { status: 400 });
    if (pend.field === "email" || pend.field === "mobile") {
      const col = pend.field === "email" ? "email" : "mobile";
      const dup = await db.execute({ sql: `SELECT id FROM users WHERE ${col}=? AND id!=?`, args: [pend.value, uid] });
      if (dup.rows.length) return NextResponse.json({ ok: false, error: "Already in use" }, { status: 400 });
    }
    const col = pend.field === "email" ? "email" : pend.field === "mobile" ? "mobile" : "bep20_address";
    await db.execute({ sql: `UPDATE users SET ${col}=?,otp_code='',otp_expiry='',profile_pending='' WHERE id=?`, args: [pend.value, uid] });
    return NextResponse.json({ ok: true, updated: pend.field });
  }

  return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
}
