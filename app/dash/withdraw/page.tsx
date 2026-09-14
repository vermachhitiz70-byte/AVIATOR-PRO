"use client";
import { useEffect, useState } from "react";

export default function Withdraw() {
  const [amount, setAmount] = useState("10");
  const [address, setAddress] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ usd?: number; debit?: number; charge?: number; net?: number; status?: string }[]>([]);
  const [max, setMax] = useState(0);
  const [minW, setMinW] = useState(24);
  const [maxW, setMaxW] = useState(25000);
  async function load() {
    const j = await fetch("/api/withdraw").then((r) => r.json());
    if (j.ok) { setRows(j.rows); setMax(j.max); setMinW(j.min ?? 24); setMaxW(j.maxLimit ?? 25000); }
  }
  useEffect(() => { load(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Submitting...");
    const r = await fetch("/api/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), address }) });
    const j = await r.json();
    setMsg(j.ok ? `Submitted. Debit ${j.debit}, Charge ${j.charge}, Net $${j.net}` : j.error);
    if (j.ok) load();
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-pink-100 p-3 text-sm text-black">Verify your BEP-20 address by email OTP in Profile.</div>
      <div className="av-card p-4">
        <label className="text-sm">Source Wallet</label>
        <div className="av-input mt-1">Principal Wallet</div>
        <label className="mt-3 block text-sm">Amount USD / USDT</label>
        <input className="av-input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="mt-1 text-xs text-slate-400">Maximum from selected wallet: ${max.toFixed(8)} (min ${minW}, max ${maxW.toLocaleString()}, charge 10%, window 7–10 AM IST – demo allows anytime)</p>
        <input className="av-input mt-2" placeholder="Your BEP20 address" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <button onClick={submit} className="av-btn-yellow mt-3 w-full py-3">Submit Crypto Withdrawal</button>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
      </div>
      <div className="av-card p-4">
        <table className="av-table"><thead><tr><th>USD</th><th>Wallet Debit</th><th>Charge</th><th>Net USDT</th><th>Status</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={i}><td>${Number(r.usd).toFixed(8)}</td><td>{Number(r.debit).toFixed(2)}</td><td>{Number(r.charge).toFixed(2)}</td><td>${Number(r.net).toFixed(8)}</td><td>{r.status}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
