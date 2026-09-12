"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1 className="text-xl font-black text-yellow-400">AVIATOR PRO</h1>
      <div className="av-card mt-4 p-5">
        <h2 className="text-lg font-bold">Forgot Password</h2>
        {step === 1 ? (
          <form onSubmit={send} className="mt-4 space-y-3">
            <input className="av-input" type="email" placeholder="Registered email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="av-btn-yellow w-full py-3">Send OTP</button>
          </form>
        ) : (
          <form onSubmit={reset} className="mt-4 space-y-3">
            {devOtp && <p className="rounded-lg bg-yellow-100 p-2 text-sm text-black">Dev mode OTP: <b>{devOtp}</b></p>}
            <input className="av-input" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required />
            <input className="av-input" type="password" placeholder="New password (min 6)" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button className="av-btn-yellow w-full py-3">Reset Password</button>
          </form>
        )}
        {msg && <p className="mt-3 rounded-lg bg-pink-100 p-3 text-sm text-black">{msg}</p>}
        <p className="mt-3 text-sm"><Link href="/login" className="text-yellow-300">Back to login</Link></p>
      </div>
    </div>
  );
}
