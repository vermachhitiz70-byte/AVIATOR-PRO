"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site";
import { ProFooter } from "@/components/marketing";
import { COUNTRIES, dialToCountry } from "@/lib/countries";

function RegisterForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", referral: sp.get("ref") || "", country: "India" });
  const [dial, setDial] = useState("+91");

  function pickCountry(name: string) {
    setForm((f) => ({ ...f, country: name }));
    const c = COUNTRIES.find((x) => x[0] === name);
    if (c) setDial(c[2]);
  }
  function pickDial(d: string) {
    setDial(d);
    const c = dialToCountry(d);
    if (c) setForm((f) => ({ ...f, country: c[0] }));
  }
  const [msg, setMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [refName, setRefName] = useState("Enter referral code above");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function lookup(ref: string) {
    if (!ref) return;
    const r = await fetch(`/api/auth/referral?code=${encodeURIComponent(ref)}`);
    const j = await r.json();
    if (j.ok) setRefName(`${j.name} · Root: ${j.root}`);
    else setRefName("Invalid referral ID");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setOkMsg("");
    const national = form.mobile.replace(/\D/g, "").replace(/^0+/, "");
    if (!national || national.length < 6 || national.length > 12) { setMsg("Sahi mobile number dalo (country code ke bina)."); return; }
    if (!form.referral.trim()) { setMsg("Referral ID compulsory hai — bina referral ke signup nahi hoga."); return; }
    if (refName === "Invalid referral ID") { setMsg("Invalid Referral ID — sahi code dalo."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, mobile: national, dial_code: dial }) });
      const j = await r.json();
      if (!j.ok) { setMsg(j.error || "Failed"); return; }
      setStep("otp");
      if (j.devOtp) setDevOtp(j.devOtp);
      setOkMsg(`OTP sent to ${j.email}. Verify to activate (ID ${j.referral_code}). Your login password will be emailed after verification.`);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, otp }) });
      const j = await r.json();
      if (!j.ok) { setMsg(j.error || "Failed"); return; }
      setOkMsg("Verified! Taking you to plan activation...");
      setTimeout(() => router.push("/activate"), 800);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const r = await fetch("/api/auth/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
    const j = await r.json();
    if (j.devOtp) setDevOtp(j.devOtp);
    if (j.ok) setOkMsg("New OTP sent.");
    else setMsg(j.error);
  }

  const input = "w-full rounded-xl bg-white/10 px-5 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="relative flex flex-1 flex-col overflow-x-clip bg-[#060b16] px-4 py-8">
        <div className="m-auto flex w-full max-w-sm flex-col items-center">
          <div className="flex w-full flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black shadow-lg">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </div>
            <h2 className="mb-1 text-center text-2xl font-black text-white">AVIATOR SMART AI</h2>
            <p className="mb-6 text-center text-sm text-slate-400">
              {step === "form" ? "Create your free account" : "Verify your email OTP"}
            </p>

            {step === "form" ? (
              <form onSubmit={submit} className="flex w-full flex-col gap-3">
                <input placeholder="Full Name" value={form.name} className={input} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <div className="flex gap-2">
                  <select value={dial} onChange={(e) => pickDial(e.target.value)} className="w-28 shrink-0 rounded-xl bg-white/10 px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-300/70" aria-label="Country code">
                    {[...new Map(COUNTRIES.map((c) => [c[2], c])).values()].map((c) => (
                      <option key={c[2]} value={c[2]} className="text-black">{c[2]} · {c[0]}</option>
                    ))}
                  </select>
                  <input placeholder="Mobile Number" inputMode="tel" value={form.mobile} className={`${input} flex-1`} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                </div>
                <div>
                  <input placeholder="Email" type="email" value={form.email} className={input} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <p className="mt-1 text-xs text-slate-500">A mandatory OTP will be sent to this email.</p>
                </div>
                <div>
                  <input placeholder="Referral ID (compulsory)" value={form.referral} className={input} onChange={(e) => { setForm({ ...form, referral: e.target.value }); lookup(e.target.value); }} required />
                  <p className="mt-1 text-xs text-emerald-300">Referral: {refName}</p>
                </div>
                <select value={form.country} onChange={(e) => pickCountry(e.target.value)} className={input} aria-label="Country">
                  {COUNTRIES.map((c) => (
                    <option key={c[1]} value={c[0]} className="text-black">{c[0]}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">Password will be generated and sent to your email after OTP verification.</p>
                {msg && <div className="text-left text-sm font-bold text-red-400">{msg}</div>}
                {okMsg && <div className="rounded-xl bg-emerald-300/10 p-3 text-sm font-bold text-emerald-300">{okMsg}</div>}
                <hr className="opacity-10" />
                <button disabled={busy} className="w-full rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black shadow transition hover:brightness-110 disabled:opacity-60">
                  {busy ? "Sending OTP..." : "Sign up"}
                </button>
                <div className="w-full text-center">
                  <span className="text-xs text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="font-bold text-yellow-300 underline hover:text-yellow-200">Log in</Link>
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={verify} className="flex w-full flex-col gap-3">
                <p className="text-center text-sm text-slate-300">Enter the 6-digit OTP sent to {form.email}.</p>
                {devOtp && <p className="rounded-xl bg-yellow-300/10 p-3 text-center text-sm text-yellow-200">Dev mode OTP: <b>{devOtp}</b></p>}
                <input placeholder="6-digit OTP" inputMode="numeric" value={otp} className={`${input} text-center text-lg font-black tracking-[0.4em]`} onChange={(e) => setOtp(e.target.value)} required />
                {msg && <div className="text-left text-sm font-bold text-red-400">{msg}</div>}
                {okMsg && <div className="rounded-xl bg-emerald-300/10 p-3 text-sm font-bold text-emerald-300">{okMsg}</div>}
                <button disabled={busy} className="w-full rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black shadow transition hover:brightness-110 disabled:opacity-60">
                  {busy ? "Verifying..." : "Verify & Activate"}
                </button>
                <button type="button" onClick={resend} className="w-full rounded-full border border-white/15 px-5 py-2.5 text-sm text-slate-300 hover:border-yellow-300">Resend OTP</button>
              </form>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center text-center">
            <p className="mb-3 text-sm text-gray-400">
              Join <span className="font-bold text-white">thousands</span> of members already flying with Aviator Smart AI.
            </p>
            <div className="flex">
              {["R", "P", "A", "V"].map((c, i) => (
                <span key={i} className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#060b16] bg-gradient-to-br from-red-500 to-yellow-500 text-xs font-black text-white first:ml-0">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ProFooter />
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
