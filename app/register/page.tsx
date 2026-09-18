"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site";
import { ProFooter } from "@/components/marketing";

function RegisterForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", mobile: "", email: "", referral: sp.get("ref") || "AV100001", password: "", confirm: "", country: "" });
  const [msg, setMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [refName, setRefName] = useState("Demo User · Root: ROOT0001");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function lookup(ref: string) {
    if (!ref) return;
    const r = await fetch(`/api/auth/referral?code=${encodeURIComponent(ref)}`);
    const j = await r.json();
    if (j.ok) setRefName(`${j.name} · Root: ${j.root}`);
    else setRefName("Invalid referral ID");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setMsg("Passwords do not match"); return; }
    setMsg("");
    setOkMsg("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!j.ok) { setMsg(j.error || "Failed"); return; }
      setStep("otp");
      if (j.devOtp) setDevOtp(j.devOtp);
      setOkMsg(`OTP sent to ${j.email}. Verify to activate (ID ${j.referral_code}).`);
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
      setOkMsg("Verified! Taking you to your dashboard...");
      setTimeout(() => router.push("/dash"), 800);
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
      <div className="cine-bg relative flex flex-1 flex-col overflow-x-clip px-4 py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[36rem] max-w-full -translate-x-1/2 rounded-full bg-red-600/15 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-yellow-300/10 blur-[100px]" />
        <div className="ring-art pointer-events-none absolute -left-24 top-1/4 hidden h-96 w-96 opacity-60 md:block" />

        <div className="relative z-10 m-auto flex w-full max-w-sm flex-col items-center">
          <div className="glass-red flex w-full flex-col items-center p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-300 text-xl font-black text-black shadow-lg">
              A
            </div>
            <h2 className="mb-1 text-center text-2xl font-black text-white">AVIATOR SMART AI</h2>
            <p className="mb-6 text-center text-sm text-slate-400">
              {step === "form" ? "Create your free account" : "Verify your email OTP"}
            </p>

            {step === "form" ? (
              <form onSubmit={submit} className="flex w-full flex-col gap-3">
                <input placeholder="Full Name" value={form.name} className={input} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input placeholder="Mobile Number" value={form.mobile} className={input} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
                <div>
                  <input placeholder="Email" type="email" value={form.email} className={input} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  <p className="mt-1 text-xs text-slate-500">A mandatory OTP will be sent to this email.</p>
                </div>
                <div>
                  <input placeholder="Referral ID" value={form.referral} className={input} onChange={(e) => { setForm({ ...form, referral: e.target.value }); lookup(e.target.value); }} />
                  <p className="mt-1 text-xs text-emerald-300">Referral: {refName}</p>
                </div>
                <input placeholder="Country" value={form.country} className={input} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                <div className="relative">
                  <input placeholder="Password" type={show ? "text" : "password"} value={form.password} className={`${input} pr-16`} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-yellow-300">
                    {show ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <input placeholder="Confirm Password" type="password" value={form.confirm} className={input} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
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
