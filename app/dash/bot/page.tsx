"use client";
import { useEffect, useState } from "react";
import { BOT_PLANS } from "@/lib/config";

export default function Bot() {
  const [amount, setAmount] = useState("100");
  const [msg, setMsg] = useState("");
  const [active, setActive] = useState<{ id?: string; plan?: string; amount?: number; daily_pct?: number; total_earned?: number; expiry_date?: string; status?: string }[]>([]);
  useEffect(() => { fetch("/api/me").then((r) => r.json()).then((j) => { if (j.ok) setActive(j.bots || (j.activeBot ? [j.activeBot] : [])); }); }, []);
  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Activating...");
    const r = await fetch("/api/bot/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount) }) });
    const j = await r.json();
    setMsg(j.ok ? `Started ${j.plan} @ ${j.daily_pct}% daily — bot #${active.length + 1}` : j.error);
    if (j.ok) fetch("/api/me").then((x) => x.json()).then((k) => { if (k.ok) setActive(k.bots || []); });
  }
  return (
    <div className="space-y-3">
      <div className="av-card p-4"><h2 className="font-black">BOT PLANS</h2><p className="text-sm text-slate-300">Activate any Bot Plan. Automated <b>daily income</b> on total active investment (2X–5X cap per tier, 365 days). Plan tiers decide your bracket.</p></div>
      {BOT_PLANS.map((p) => (<div key={p.id} className="av-card p-4"><h3 className="font-black">{p.name}</h3><p>{p.min.toLocaleString()}–{p.max.toLocaleString()} USDT · {p.dailyPct}% daily auto-profits · {p.multiplier}X capping · 365 days</p></div>))}
      <div className="av-card p-4">
        <h3 className="font-bold">Start Bot (from Principal wallet)</h3>
        <p className="mt-1 text-xs text-slate-400">Deposit alone earns nothing — press Start Bot. Min $10, multiples of $10 only (10, 20, 30 … 100, 110 …).</p>
        <form onSubmit={activate} className="mt-2 flex gap-2"><input className="av-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10, 20, 100" /><button className="av-btn-yellow px-5">Start Bot</button></form>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
        <div className="mt-2 space-y-1 text-sm">
          {active.map((a, i) => (
            <p key={a.id || i} className="rounded bg-black/30 px-2 py-1.5">Bot #{i + 1}: {String(a.plan)} · ${Number(a.amount).toFixed(2)} @ {Number(a.daily_pct || 0)}% · Earned ${Number(a.total_earned || 0).toFixed(2)} · Exp {String(a.expiry_date || "-").slice(0, 10)}</p>
          ))}
          {!active.length && <p className="text-slate-400">No active bots yet.</p>}
        </div>
      </div>
    </div>
  );
}
