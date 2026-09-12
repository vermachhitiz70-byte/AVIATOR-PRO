"use client";
import { useEffect, useState } from "react";

export default function Recharge() {
  const [amount, setAmount] = useState("200");
  const [tx, setTx] = useState("");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ created_at?: string; request_id?: string; requested?: number; actual?: number; status?: string }[]>([]);
  const [addr, setAddr] = useState("");
  useEffect(() => {
    fetch("/api/recharge").then((r) => r.json()).then((j) => { if (j.ok) { setRows(j.rows); setAddr(j.address); } });
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Submitting...");
    const r = await fetch("/api/recharge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), tx_hash: tx }) });
    const j = await r.json();
    setMsg(j.ok ? `Submitted ${j.request_id} – pending admin approval` : j.error);
    if (j.ok) { setTx(""); const r2 = await fetch("/api/recharge").then((x) => x.json()); if (r2.ok) setRows(r2.rows); }
  }
  return (
    <div className="space-y-3">
      <div className="av-card p-4">
        <h2 className="font-black">Recharge (BEP20 / USDTBSC)</h2>
        <p className="mt-1 break-all text-xs text-slate-300">Deposit address: {addr || "loading..."}</p>
        <p className="text-xs text-slate-400">Send USDT-BEP20 to the address, then paste TX hash. Balance credits after admin approval + 5-level commission on first recharge.</p>
        <form onSubmit={submit} className="mt-3 space-y-2">
          <input className="av-input" placeholder="Amount USD / USDT (min 10)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <input className="av-input" placeholder="TX hash (e.g. 0x...)" value={tx} onChange={(e) => setTx(e.target.value)} required />
          <button className="av-btn-yellow w-full py-3">Submit Recharge</button>
        </form>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
      </div>
      <div className="av-card p-4">
        <h3 className="font-bold">⛉ Your Recharge Verification</h3>
        <p className="text-xs text-slate-400">Gateway-confirmed and admin-accepted payments are shown separately.</p>
        <table className="av-table mt-2"><thead><tr><th>Date</th><th>Request</th><th>Requested</th><th>Actual</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={i}><td>{String(r.created_at || "").slice(0, 16).replace("T", " ")}</td><td className="break-all">{r.request_id}</td><td>{Number(r.requested).toFixed(8)} USDT</td><td>{Number(r.actual).toFixed(2)} · {r.status}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
