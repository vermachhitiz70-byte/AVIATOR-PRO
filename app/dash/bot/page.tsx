"use client";
import { useEffect, useState } from "react";
import { BOT_PLANS } from "@/lib/config";

export default function Bot() {
  const [amount, setAmount] = useState("100");
  const [msg, setMsg] = useState("");
  const [active, setActive] = useState<{ plan?: string; amount?: number; total_earned?: number; expiry_date?: string; status?: string } | null>(null);
  useEffect(() => { fetch("/api/me").then((r) => r.json()).then((j) => { if (j.ok) setActive(j.activeBot); }); }, []);
  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Activating...");
    const r = await fetch("/api/bot/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount) }) });
    const j = await r.json();
    setMsg(j.ok ? `Activated ${j.plan} @ ${j.daily_pct}% daily` : j.error);
    if (j.ok) setActive(j.bot);
  }
  return (
    <div className="space-y-3">
      <div className="av-card p-4"><h2 className="font-black">BOT PLANS</h2><p className="text-sm text-slate-300">Activate any Bot Plan. Automated <b>daily income</b> on total active investment (3X cap, 365 days). Plan tiers decide your bracket.</p></div>
      {BOT_PLANS.map((p) => (<div key={p.id} className="av-card p-4"><h3 className="font-black">{p.name}</h3><p>{p.min.toLocaleString()}–{p.max.toLocaleString()} USDT · Daily auto-profits · 3X capping · 365 days</p></div>))}
      <div className="av-card p-4">
        <h3 className="font-bold">Activate Bot (from Principal wallet)</h3>
        <form onSubmit={activate} className="mt-2 flex gap-2"><input className="av-input" value={amount} onChange={(e) => setAmount(e.target.value)} /><button className="av-btn-yellow px-5">Activate</button></form>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
        {active && <p className="mt-2 text-sm">Active: {String(active.plan)} · ${Number(active.amount).toFixed(2)} · Earned ${Number(active.total_earned || 0).toFixed(2)} · Exp {String(active.expiry_date || "-").slice(0, 10)} · {String(active.status)}</p>}
      </div>
    </div>
  );
}
