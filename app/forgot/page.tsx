"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site";
import { ProFooter } from "@/components/marketing";

export default function Forgot() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState("");
  const [devOtp, setDevOtp] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json();
    if (!j.ok) { setMsg(j.error); return; }
    if (j.devOtp) setDevOtp(j.devOtp);
    setStep(2);
    setMsg("OTP sent to your email.");
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/auth/forgot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp, password: pw }) });
    const j = await r.json();
    if (!j.ok) { setMsg(j.error); return; }
    setMsg("Password reset! Redirecting to login...");
    setTimeout(() => router.push("/login"), 1000);
  }
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="relative flex flex-1 flex-col overflow-x-clip bg-[#060b16] px-4 py-8">
        <div className="m-auto flex w-full max-w-sm flex-col items-center">
          <div className="flex w-full flex-col items-center rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-300 text-xl font-black text-black shadow-lg">
              A
            </div>
            <h2 className="mb-1 text-center text-2xl font-black text-white">Reset Password</h2>
            <p className="mb-6 text-center text-sm text-slate-400">OTP goes to your registered email</p>
            <div className="flex w-full flex-col gap-4">
              {step === 1 ? (
                <form onSubmit={send} className="flex w-full flex-col gap-3">
                  <input className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70" type="email" placeholder="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <button className="av-btn-yellow btn-shine w-full py-3">Send OTP</button>
                </form>
              ) : (
                <form onSubmit={reset} className="flex w-full flex-col gap-3">
                  {devOtp && <p className="rounded-lg bg-yellow-100 p-2 text-sm text-black">Dev mode OTP: <b>{devOtp}</b></p>}
                  <input className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />
                  <input className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-300/70" type="password" placeholder="New password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} required />
                  <button className="av-btn-yellow btn-shine w-full py-3">Reset Password</button>
                </form>
              )}
              {msg && <p className="rounded-lg bg-pink-100 p-3 text-sm text-black">{msg}</p>}
              <p className="w-full text-center text-sm"><Link href="/login" className="font-bold text-yellow-300 underline hover:text-yellow-200">Back to login</Link></p>
            </div>
          </div>
        </div>
      </div>
      <ProFooter />
    </div>
  );
}
