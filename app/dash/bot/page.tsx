"use client";
import { useEffect, useState } from "react";
import { BOT_PLANS } from "@/lib/config";

type Bot = { id?: string; plan?: string; amount?: number; daily_pct?: number; total_earned?: number; expiry_date?: string; status?: string };

const TIER_STYLE: Record<string, { glow: string; grad: string; icon: string }> = {
  green: { glow: "tier-glow-green", grad: "from-emerald-400 to-green-600", icon: "🌱" },
  gold: { glow: "tier-glow-gold", grad: "from-yellow-300 to-amber-500", icon: "🥇" },
  red: { glow: "tier-glow-red", grad: "from-red-400 to-orange-600", icon: "💎" },
};

export default function Bot() {
  const [amount, setAmount] = useState("100");
  const [msg, setMsg] = useState("");
  const [principal, setPrincipal] = useState(0);
  const [active, setActive] = useState<Bot[]>([]);
  const [planOpen, setPlanOpen] = useState(false);
  const [planId, setPlanId] = useState("starter");

  const plan = BOT_PLANS.find((p) => p.id === planId) || BOT_PLANS[0];
  const st = TIER_STYLE[plan.color] || TIER_STYLE.green;
  const sample = Math.min(Math.max(Number(amount) || 0, plan.min), plan.max);

  async function load() {
    const j = await fetch("/api/me").then((r) => r.json()).catch(() => null);
    if (j?.ok) {
      setActive(j.bots || (j.activeBot ? [j.activeBot] : []));
      setPrincipal(Number(j.wallet?.principal || 0));
    }
  }
  useEffect(() => { load(); }, []);

  async function activate(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Starting bot...");
    const r = await fetch("/api/bot/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount) }) });
    const j = await r.json();
    setMsg(j.ok ? `🤖 Bot #${active.length + 1} started: ${j.plan} @ ${j.daily_pct}% daily` : j.error);
    if (j.ok) load();
  }

  return (
    <div className="space-y-3">
      <div className="av-card p-4">
        <h2 className="font-black">🤖 My Trading Bots ({active.length})</h2>
        <p className="mt-1 text-xs text-slate-400">Deposit alone earns nothing — start a bot. Min $10, multiples of $10. Principal balance: <b className="text-yellow-300">${principal.toFixed(2)}</b></p>
        <div className="mt-2 space-y-1.5 text-sm">
          {active.map((a, i) => (
            <div key={a.id || i} className="flex flex-wrap items-center justify-between gap-1 rounded-xl bg-black/40 px-3 py-2">
              <span className="font-bold">Bot #{i + 1} · {String(a.plan)}</span>
              <span className="text-xs text-slate-300">${Number(a.amount).toFixed(0)} @ {Number(a.daily_pct || 0)}% · Earned ${Number(a.total_earned || 0).toFixed(2)} · Exp {String(a.expiry_date || "-").slice(0, 10)}</span>
            </div>
          ))}
          {!active.length && <p className="text-sm text-slate-400">No active bots yet — choose a plan below.</p>}
        </div>
      </div>

      {/* Plan selector */}
      <button onClick={() => setPlanOpen((o) => !o)} className={`glass-red relative w-full overflow-hidden rounded-2xl p-5 text-left transition ${st.glow}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${st.grad} text-2xl shadow-lg`}>{st.icon}</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Selected plan — tap to change</p>
              <p className="text-xl font-black">{plan.name}</p>
              <p className="text-xs text-slate-300">${plan.min.toLocaleString()}–${plan.max.toLocaleString()} · {plan.dailyPct}% daily · {plan.multiplier}X cap · 365 days</p>
            </div>
          </div>
          <span className={`text-2xl transition-transform ${planOpen ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {planOpen && (
        <div className="grid gap-3 sm:grid-cols-2">
          {BOT_PLANS.map((p) => {
            const ps = TIER_STYLE[p.color] || TIER_STYLE.green;
            const sel = p.id === plan.id;
            return (
              <button
                key={p.id}
                onClick={() => { setPlanId(p.id); setAmount(String(Math.min(Math.max(Number(amount) || p.min, p.min), p.max))); setPlanOpen(false); }}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-1 ${sel ? "border-yellow-300 bg-yellow-300/10 shadow-[0_8px_30px_rgba(250,204,21,0.25)]" : "border-white/10 bg-gradient-to-b from-white/[0.07] to-transparent hover:border-white/25 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"}`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ps.grad}`} />
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${ps.grad} text-xl shadow`}>{ps.icon}</span>
                  <div>
                    <p className="font-black">{p.name} {sel && <span className="ml-1 rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-black text-black">SELECTED</span>}</p>
                    <p className="text-xs text-slate-400">${p.min.toLocaleString()} – ${p.max.toLocaleString()} USDT</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">Daily</p><p className="text-sm font-black text-emerald-300">{p.dailyPct}%</p></div>
                  <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">Cap</p><p className="text-sm font-black">{p.multiplier}X</p></div>
                  <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">Term</p><p className="text-sm font-black">365d</p></div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Amount + start */}
      <div className="av-card p-4">
        <h3 className="font-bold">Start <span className="text-yellow-300">{plan.name}</span> bot</h3>
        <p className="mt-1 text-xs text-slate-400">
          ${plan.min.toLocaleString()}–${plan.max.toLocaleString()} · ${sample.toLocaleString()} par ≈ <b className="text-emerald-300">${((sample * plan.dailyPct) / 100).toFixed(2)}/day</b> · multiples of $10 only
        </p>
        <form onSubmit={activate} className="mt-2 flex gap-2">
          <input className="av-input" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 10, 20, 100" inputMode="numeric" />
          <button className="av-btn-yellow whitespace-nowrap px-6">Start ${Number(amount) || 0}</button>
        </form>
        {msg && <p className="mt-2 text-sm font-bold text-yellow-200">{msg}</p>}
      </div>
    </div>
  );
}
