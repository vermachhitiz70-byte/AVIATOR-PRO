"use client";
import { useEffect, useState } from "react";
import { BUSINESS_RULES, ROI_LEVELS, FIRST_RECHARGE_LEVELS, MILESTONES } from "@/lib/config";

export default function BusinessPlan() {
  const [stats, setStats] = useState<{ self?: number; direct?: number; team?: number; claimed?: number[] } | null>(null);
  const [msg, setMsg] = useState("");
  async function load() {
    const j = await fetch("/api/team").then((r) => r.json());
    if (j.ok) setStats(j);
  }
  useEffect(() => { load(); }, []);
  async function claim(tier: number) {
    setMsg("Claiming...");
    const r = await fetch("/api/rewards/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier }) });
    const j = await r.json();
    setMsg(j.ok ? `Claimed $${j.credited} to Reward wallet!` : j.error);
    if (j.ok) load();
  }
  return (
    <div className="space-y-3">
      <div className="av-card p-4"><h2 className="text-xl font-black">Business Plan Details</h2><p className="text-sm text-slate-300">All important percentages, wallet rules, bot plans, level income, capping, withdrawal charge, and reward milestones are shown transparently.</p></div>
      {[["Daily ROI (auto)", "3%–10% daily by investment tier"],["Daily Bet Limit (visual)", `${BUSINESS_RULES.dailyRunLimit}`],["Withdrawal Charge", `${BUSINESS_RULES.withdrawalChargePct}%`],["Withdrawal Limits", `$${BUSINESS_RULES.minWithdrawal} – $${BUSINESS_RULES.maxWithdrawal.toLocaleString()}`],["Income Capping", "2X–5X per tier (direct ROI only)"],["Direct + Level Income", "Never capped"],["Bot Validity", "365 days"],["Crypto Gateway", BUSINESS_RULES.cryptoGateway],["AI Help Desk", BUSINESS_RULES.aiHelpDesk],["Bot Simulation Rounds", BUSINESS_RULES.botRoundsPerDay],["Reward Milestones", "20"]].map(([a, b]) => (<div key={a} className="av-card p-4"><p className="text-sm text-slate-400">{a}</p><p className="text-lg font-black">{b}</p></div>))}
      <div className="av-card p-4"><h3 className="font-bold">10 Level ROI Income (on daily profits)</h3><div className="mt-2 grid grid-cols-3 gap-2">{ROI_LEVELS.map((p, i) => (<div key={i} className="rounded-lg bg-black/40 p-2 text-center text-sm">L{i + 1} <b className="text-emerald-300">{p}%</b></div>))}</div></div>
      <div className="av-card p-4"><h3 className="font-bold">5 Level First Recharge Income (one-time)</h3><div className="mt-2 grid grid-cols-3 gap-2">{FIRST_RECHARGE_LEVELS.map((p, i) => (<div key={i} className="rounded-lg bg-black/40 p-2 text-center text-sm">L{i + 1} <b className="text-emerald-300">{p}%</b></div>))}</div></div>
      <div className="av-card p-4"><h3 className="font-bold">My progress: Self ${Number(stats?.self || 0).toFixed(2)} · Direct ${Number(stats?.direct || 0).toFixed(2)} · Team ${Number(stats?.team || 0).toFixed(2)}</h3>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
        <div className="mt-2 space-y-1">{MILESTONES.map((m) => {
          const done = (stats?.self || 0) >= m.self && (stats?.direct || 0) >= m.direct && (stats?.team || 0) >= m.team;
          const claimed = stats?.claimed?.includes(m.tier);
          return (<div key={m.tier} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-xs"><span>{m.tier}. {m.name} · Self ${m.self} · Direct ${m.direct} · Team ${m.team} · ${m.wallet}</span>{claimed ? <span className="font-bold text-slate-500">CLAIMED</span> : done ? <button onClick={() => claim(m.tier)} className="av-btn-yellow px-3 py-1 text-xs">Claim</button> : <span className="text-slate-500">LOCKED</span>}</div>);
        })}</div>
      </div>
    </div>
  );
}
