"use client";
import { useEffect, useState } from "react";

type ProfileUser = {
  name?: string; first_name?: string; last_name?: string; mobile?: string; email?: string;
  country?: string; referral_code?: string; rank?: string; kyc_status?: string;
  bep20_address?: string; aadhaar?: string; pan?: string; address?: string;
};

const input = "av-input";
const label = "mb-1 block text-xs font-bold text-slate-300";

export default function Profile() {
  const [d, setD] = useState<{ user?: ProfileUser; wallet?: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState({ first_name: "", last_name: "", country: "", aadhaar: "", pan: "", address: "" });
  // OTP-gated change state (email / mobile / BEP20)
  const [chg, setChg] = useState<{ field: string; value: string; step: "edit" | "otp"; otp: string; busy: boolean; msg: string }>({
    field: "bep20_address", value: "", step: "edit", otp: "", busy: false, msg: "",
  });

  async function load() {
    setLoading(true);
    const j = await fetch("/api/profile").then((r) => r.json()).catch(() => null);
    if (j?.ok && j.user) {
      const u = j.user as ProfileUser;
      setD({ user: u, wallet: undefined });
      setF({ first_name: u.first_name || "", last_name: u.last_name || "", country: u.country || "", aadhaar: u.aadhaar || "", pan: u.pan || "", address: u.address || "" });
      setChg((c) => ({ ...c, value: c.field === "email" ? u.email || "" : c.field === "mobile" ? u.mobile || "" : u.bep20_address || "" }));
    }
    const m = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    if (m?.ok) setD((p) => ({ user: { ...(p?.user || {}), ...(m.user || {}) } as ProfileUser, wallet: m.wallet }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const u = d?.user || {};
  const w = d?.wallet || {};
  const refLink = typeof window !== "undefined" && u.referral_code ? `${window.location.origin}/register?ref=${u.referral_code}` : "";

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Saving...");
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", ...f }) });
    const j = await r.json();
    setMsg(j.ok ? "Saved permanently ✓" : j.error || "Failed");
    if (j.ok) load();
  }

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setChg((c) => ({ ...c, busy: true, msg: "Sending OTP..." }));
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "request_otp", field: chg.field, value: chg.value }) });
    const j = await r.json();
    if (j.ok && j.needOtp) setChg((c) => ({ ...c, step: "otp", busy: false, msg: j.devOtp ? `Dev OTP: ${j.devOtp}` : `OTP sent${j.sentTo ? ` to ${j.sentTo}` : ""}. Enter it below.` }));
    else setChg((c) => ({ ...c, busy: false, msg: j.error || "Failed" }));
  }
  async function confirmOtp(e: React.FormEvent) {
    e.preventDefault();
    setChg((c) => ({ ...c, busy: true, msg: "Verifying..." }));
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm_otp", otp: chg.otp }) });
    const j = await r.json();
    if (j.ok) {
      setChg((c) => ({ ...c, step: "edit", otp: "", busy: false, msg: "Replaced permanently ✓" }));
      load();
    } else setChg((c) => ({ ...c, busy: false, msg: j.error || "Failed" }));
  }
  function switchField(field: string) {
    setChg({ field, value: field === "email" ? u.email || "" : field === "mobile" ? u.mobile || "" : u.bep20_address || "", step: "edit", otp: "", busy: false, msg: "" });
  }

  const fieldLabel = chg.field === "email" ? "Email ID" : chg.field === "mobile" ? "Phone number" : "BEP20 payout address";

  return (
    <div className="space-y-3">
      <div className="av-card p-4">
        <h2 className="font-black">Profile</h2>
        {loading ? <p className="mt-1 text-sm text-slate-400">Loading profile…</p> : (
          <>
            <p className="mt-1 text-sm">Name: <b>{u.first_name || u.name || "—"} {u.last_name || ""}</b> · ID <b className="font-mono text-yellow-300">{u.referral_code || "—"}</b> · {u.rank || "Starter"} · KYC {u.kyc_status || "pending"}</p>
            <p className="mt-1 text-xs text-slate-300">Email: {u.email || "—"} · Phone: {u.mobile || "—"}</p>
            <p className="mt-1 break-all text-xs text-slate-400">Referral link: {refLink || "—"}</p>
            <p className="mt-1 text-sm">Deposit ${Number(w.principal || 0).toFixed(2)} · ROI ${Number(w.roi || 0).toFixed(2)} · Level ${Number(w.commission || 0).toFixed(2)} · Reward ${Number(w.reward || 0).toFixed(2)}</p>
          </>
        )}
      </div>

      <div className="av-card space-y-3 p-4">
        <h3 className="font-bold">Personal details <span className="text-xs font-normal text-slate-400">(saved permanently)</span></h3>
        <form onSubmit={saveProfile} className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div><p className={label}>First name</p><input className={input} value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} placeholder="First name" /></div>
            <div><p className={label}>Surname</p><input className={input} value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} placeholder="Surname" /></div>
          </div>
          <div><p className={label}>Country</p><input className={input} value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} placeholder="Country" /></div>
          <div><p className={label}>Full address (for future KYC)</p><input className={input} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Village / City, District, State, PIN" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><p className={label}>Aadhaar (12 digits)</p><input className={input} value={f.aadhaar} onChange={(e) => setF({ ...f, aadhaar: e.target.value })} placeholder="12-digit Aadhaar" inputMode="numeric" /></div>
            <div><p className={label}>PAN (ABCDE1234F)</p><input className={input} value={f.pan} onChange={(e) => setF({ ...f, pan: e.target.value.toUpperCase() })} placeholder="PAN number" /></div>
          </div>
          <button className="av-btn-yellow px-4 py-2.5">Save permanently</button>
        </form>
        {msg && <p className="text-sm font-bold text-yellow-200">{msg}</p>}
      </div>

      <div className="av-card space-y-2 p-4">
        <h3 className="font-bold">Payout contact <span className="text-xs font-normal text-slate-400">(change needs email OTP)</span></h3>
        <div className="flex gap-2">
          {(["email", "mobile", "bep20_address"] as const).map((k) => (
            <button key={k} onClick={() => switchField(k)} className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold ${chg.field === k ? "bg-yellow-300 text-black" : "border border-white/15 text-slate-300"}`}>
              {k === "email" ? "Email" : k === "mobile" ? "Phone" : "BEP20"}
            </button>
          ))}
        </div>
        {chg.step === "edit" ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-2">
            <p className={label}>Current {fieldLabel}: <b className="break-all text-white">{chg.field === "email" ? u.email || "—" : chg.field === "mobile" ? u.mobile || "—" : u.bep20_address || "— (not set)"}</b></p>
            <input className={input} value={chg.value} onChange={(e) => setChg({ ...chg, value: e.target.value })} placeholder={`New ${fieldLabel}`} required />
            <button disabled={chg.busy} className="av-btn-yellow px-4 py-2.5 disabled:opacity-60">{chg.busy ? "Sending..." : "Send OTP & Replace"}</button>
          </form>
        ) : (
          <form onSubmit={confirmOtp} className="flex flex-col gap-2">
            <p className={label}>Enter OTP to replace {fieldLabel}</p>
            <input className={`${input} text-center text-lg font-black tracking-[0.4em]`} value={chg.otp} onChange={(e) => setChg({ ...chg, otp: e.target.value })} placeholder="6-digit OTP" inputMode="numeric" required />
            <button disabled={chg.busy} className="av-btn-yellow px-4 py-2.5 disabled:opacity-60">{chg.busy ? "Verifying..." : "Verify & Replace"}</button>
            <button type="button" onClick={() => setChg({ ...chg, step: "edit", otp: "", msg: "" })} className="text-xs text-slate-400">← back (old value stays)</button>
          </form>
        )}
        {chg.msg && <p className="text-sm font-bold text-yellow-200">{chg.msg}</p>}
      </div>
    </div>
  );
}
