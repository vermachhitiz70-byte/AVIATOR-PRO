"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BUSINESS_RULES, ROI_LEVELS, FIRST_RECHARGE_LEVELS, MILESTONES } from "@/lib/config";

function Bar({ pct }: { pct: number }) {
  const p = Math.min(100, Math.max(0, pct));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/50">
      <div className="h-full rounded-full bg-gradient-to-r from-yellow-300 to-emerald-300 transition-all" style={{ width: `${p}%` }} />
    </div>
  );
}

function left(val: number, target: number) {
  const rem = target - val;
  return rem <= 0 ? "done ✓" : `$${Math.ceil(rem).toLocaleString()} left`;
}

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

  const self = Number(stats?.self || 0);
  const direct = Number(stats?.direct || 0);
  const team = Number(stats?.team || 0);
  const claimed = stats?.claimed || [];
  const next = MILESTONES.find((m) => !claimed.includes(m.tier));
  const doneCount = claimed.length;

  return (
    <div className="space-y-3">
      <div className="av-card p-4">
        <h2 className="text-xl font-black">My Referral Achievements</h2>
        <p className="mt-1 text-sm text-slate-300">
          Unlocked <b className="text-yellow-300">{doneCount}/20</b> · Self ${self.toFixed(0)} · Direct ${direct.toFixed(0)} · Team ${team.toFixed(0)}
        </p>
        {next && (
          <div className="mt-3 rounded-xl border border-yellow-300/30 bg-yellow-300/5 p-3">
            <p className="text-sm font-black text-yellow-200">Next: {next.tier}. {next.name} → ${next.wallet} reward</p>
            <div className="mt-2 space-y-1.5 text-xs">
              {[["Self", self, next.self], ["Direct", direct, next.direct], ["Team", team, next.team]].map(([k, v, t]) => (
                <div key={k as string}>
                  <div className="mb-0.5 flex justify-between text-slate-300"><span>{k} ${Number(v).toFixed(0)}/${Number(t).toLocaleString()}</span><span className="font-bold text-emerald-300">{left(Number(v), Number(t))}</span></div>
                  <Bar pct={(Number(v) / Number(t)) * 100} />
                </div>
              ))}
            </div>
          </div>
        )}
        {msg && <p className="mt-2 text-sm font-bold text-yellow-200">{msg}</p>}
      </div>

      <div className="space-y-1.5">
        {MILESTONES.map((m) => {
          const isDone = self >= m.self && direct >= m.direct && team >= m.team;
          const isClaimed = claimed.includes(m.tier);
          return (
            <div key={m.tier} className="av-card p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold">{m.tier}. {m.name} <span className="text-emerald-300">${m.wallet}</span></p>
                {isClaimed ? <span className="shrink-0 text-xs font-bold text-slate-500">CLAIMED ✓</span>
                  : isDone ? <button onClick={() => claim(m.tier)} className="av-btn-yellow shrink-0 px-3 py-1 text-xs">Claim ${m.wallet}</button>
                  : <span className="shrink-0 text-xs text-slate-500">LOCKED</span>}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                {[["S", self, m.self], ["D", direct, m.direct], ["T", team, m.team]].map(([k, v, t]) => (
                  <div key={k as string}>
                    <p className="mb-0.5 text-slate-400">{k}: {left(Number(v), Number(t))}</p>
                    <Bar pct={(Number(v) / Number(t)) * 100} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="av-card p-4">
        <h3 className="font-bold">Referral rates <Link href="/dash/campaigns" className="ml-2 text-xs font-normal text-sky-300 underline">Tours → Campaigns</Link></h3>
        <p className="mt-1 text-xs text-slate-400">Direct (first recharge): L1 5% · L2 2% · L3–L5 1% · ROI levels: L1 5% · L2–L5 2% · L6–L10 1%</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {ROI_LEVELS.map((p, i) => (<div key={i} className="rounded-lg bg-black/40 p-2 text-center text-xs">L{i + 1} <b className="text-emerald-300">{p}%</b></div>))}
        </div>
        <p className="mt-2 text-xs text-slate-400">Bot validity {BUSINESS_RULES.botValidityDays} days · Full plan on website</p>
      </div>
    </div>
  );
}
