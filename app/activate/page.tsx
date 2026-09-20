"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { ProFooter } from "@/components/marketing";
import { BOT_PLANS, DEPOSIT_ADDRESS } from "@/lib/config";

function ActivateForm() {
  const sp = useSearchParams();
  const router = useRouter();
  const planId = sp.get("plan") || "starter";
  const plan = BOT_PLANS.find((p) => p.id === planId) || BOT_PLANS[0];
  const [amount, setAmount] = useState(String(plan.min));
  const [tx, setTx] = useState("");
  const [addr, setAddr] = useState(DEPOSIT_ADDRESS);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [qr, setQr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => { setAmount(String(plan.min)); }, [plan.min]);
  useEffect(() => {
    fetch("/api/recharge").then((r) => r.json()).then((j) => {
      const a = String(j.address || "").trim();
      if (j.ok && a && !a.includes("YOUR")) setAddr(a);
      if (j.ok && j.qr) setQr(String(j.qr));
    }).catch(() => {});
    // Already activated (admin approved) => go to dashboard
    fetch("/api/me").then((r) => r.json()).then((m) => {
      if (m.ok && ((m.totalInvestment || 0) > 0 || m.activeBot)) router.replace("/dash");
    }).catch(() => {});
    // check if already has pending
    fetch("/api/recharge").then((r) => r.json()).then((j) => {
      if (j.ok && j.rows?.some((r: { status: string }) => r.status === "pending")) setPending(true);
    });
  }, [router]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) { const rd = new FileReader(); rd.onload = () => setPreview(String(rd.result)); rd.readAsDataURL(f); } else setPreview("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg("Please upload payment screenshot"); return; }
    const amt = Number(amount);
    if (amt < plan.min || amt > plan.max) { setMsg(`Amount must be ${plan.min}–${plan.max} USDT for ${plan.name}`); return; }
    if (!tx) { setMsg("TX hash required"); return; }
    setBusy(true);
    setMsg("Submitting...");
    try {
      const res = await fetch("/api/recharge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, tx_hash: tx, screenshot_url: preview }) });
      const j = await res.json();
      if (!j.ok) { setMsg(j.error); return; }
      setMsg(`Submitted ${j.request_id} – pending approval. You will be notified once approved.`);
      setPending(true);
    } catch { setMsg("Failed, try again"); } finally { setBusy(false); }
  }

  if (pending) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="m-auto max-w-md p-6 text-center">
          <div className="av-card p-8">
            <p className="text-4xl">⏳</p>
            <h2 className="mt-2 text-xl font-black">Your account is going for approval.</h2>
            <p className="mt-2 text-sm text-slate-300">Your payment is under review. Once it is approved, your dashboard will be unlocked, and your earning will begin.</p>
            <button onClick={() => fetch("/api/me").then((r) => r.json()).then((m) => { if (m.ok && ((m.totalInvestment || 0) > 0 || m.activeBot)) router.replace("/dash"); else setMsg("Still pending — please try again later."); })} className="av-btn-yellow mt-4 inline-block px-6 py-2">Check Approval Status</button>
            {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
          </div>
        </div>
        <ProFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-black">Choose your plan — {plan.name}</h1>
        <p className="text-sm text-slate-400">Min {plan.min} – Max {plan.max} USDT · {plan.dailyPct}% daily · {plan.multiplier}X cap · 365 days</p>
        <div className="av-card mt-4 p-4">
          <p className="text-sm text-slate-300">Select any tier, then pay via BEP20 to activate.</p>
          <div className="mt-3 grid gap-2">
            {BOT_PLANS.map((p) => (
              <Link key={p.id} href={`/activate?plan=${p.id}`} className={`flex justify-between rounded-xl border px-4 py-3 text-sm ${p.id === plan.id ? "border-yellow-300 bg-yellow-300/10" : "border-white/10 hover:bg-white/5"}`}>
                <span className="font-bold">{p.name} — ${p.min}–${p.max}</span><span className={p.id === plan.id ? "text-yellow-300 font-bold" : "text-slate-400"}>{p.id === plan.id ? "Selected" : "Choose"}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="av-card mt-4 p-4">
          <h2 className="font-black">Pay via BEP20 — {plan.name}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center rounded-xl bg-white p-4">
              {qr ? <img src={qr} alt="Deposit QR" className="h-[180px] w-[180px] object-contain" /> : addr ? <QRCodeSVG value={addr} size={180} /> : <p className="text-xs text-slate-500">Loading QR...</p>}
              <p className="mt-2 text-center text-[11px] text-slate-600">Scan to pay USDT-BEP20</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-300">Deposit address (BEP20)</p>
              <div className="mt-1 flex gap-2">
                <p className="flex-1 break-all rounded-lg bg-black/40 px-3 py-2 text-xs font-mono text-yellow-300">{addr}</p>
                <button onClick={() => addr && navigator.clipboard.writeText(addr)} className="rounded-lg border border-white/20 px-3 py-2 text-xs">Copy</button>
              </div>
              <p className="mt-2 text-xs text-slate-400">Network: BEP20 (BSC) · Currency: USDT</p>
            </div>
          </div>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className="av-input" placeholder={`Amount USDT (${plan.min}–${plan.max})`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <input className="av-input" placeholder="TX hash (e.g. 0x...)" value={tx} onChange={(e) => setTx(e.target.value)} required />
            <div>
              <p className="mb-1 text-xs font-bold text-slate-300">Payment screenshot *</p>
              <input type="file" accept="image/*" onChange={onFile} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" required />
              {preview && <img src={preview} alt="preview" className="mt-2 max-h-40 rounded-lg border border-white/10" />}
            </div>
            <button disabled={busy} className="av-btn-yellow w-full py-3 disabled:opacity-60">{busy ? "Submitting..." : `Pay $${amount} & Submit for Approval`}</button>
          </form>
          {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
        </div>
      </div>
      <ProFooter />
    </div>
  );
}

export default function ActivatePage() {
  return <Suspense fallback={<div className="p-6">Loading...</div>}><ActivateForm /></Suspense>;
}
