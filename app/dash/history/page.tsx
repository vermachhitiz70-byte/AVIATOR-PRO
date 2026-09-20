"use client";
import { useEffect, useState } from "react";

type Ev = {
  ts: string; label: string; detail: string; amount: number | null;
  date: string; time: string; wallet: string;
  fromName: string; fromCode: string; pct: number | null; levelNum: number | null;
};

const FILTERS: [string, string[]][] = [
  ["All", []],
  ["Deposits", ["Deposit confirmed", "Recharge"]],
  ["Withdrawals", ["Withdrawal"]],
  ["Daily ROI", ["Daily ROI"]],
  ["Level & Direct", ["Direct income", "Level income"]],
  ["Rewards", ["Reward income"]],
  ["Bots", ["Bot activated"]],
];

export default function History() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [summary, setSummary] = useState<{ invested: number; earned: number; balance: number } | null>(null);
  const [filter, setFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [failed, setFailed] = useState(false);

  async function load(retried = false): Promise<void> {
    setFailed(false);
    let r: Response;
    try {
      r = await fetch("/api/history");
    } catch {
      if (!retried) { setTimeout(() => load(true), 1500); return; }
      setFailed(true);
      return;
    }
    if (r.status === 401) {
      if (!retried) {
        await new Promise((res) => setTimeout(res, 1200));
        await load(true);
        return;
      }
      window.location.href = "/login";
      return;
    }
    try {
      const j = await r.json();
      if (j.ok) { setEvents(j.events || []); setSummary(j.summary); }
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }
  useEffect(() => { load(); }, []);

  const keys = FILTERS.find(([k]) => k === filter)?.[1] || [];
  const list = keys.length ? events.filter((e) => keys.some((k) => e.label.startsWith(k))) : events;
  const shown = showAll ? list : list.slice(0, 20);

  return (
    <div className="space-y-3">
      <div className="av-card p-4 text-center">
        <h2 className="font-black">Transaction History</h2>
        {summary && (
          <p className="mt-1 text-xs text-slate-300">
            In <b className="text-white">${summary.invested.toFixed(0)}</b> · Earned <b className="text-emerald-300">+${summary.earned.toFixed(2)}</b> · Balance <b className="text-yellow-300">${summary.balance.toFixed(2)}</b>
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([k]) => (
          <button key={k} onClick={() => { setFilter(k); setShowAll(false); }} className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-yellow-300 text-black" : "border border-white/15 text-slate-300"}`}>
            {k}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {shown.map((h, i) => (
          <div key={i} className="av-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-bold">{h.label}</span>
              {h.amount !== null && (
                <b className={h.amount < 0 ? "text-red-300" : "text-emerald-300"}>
                  {h.amount < 0 ? "−" : "+"}${Math.abs(h.amount).toFixed(2)}
                </b>
              )}
            </div>
            <p className="mt-0.5 break-words text-[11px] text-slate-400">
              {h.date} {h.time}
              {h.fromName !== "—" && <> · {h.fromName} ({h.fromCode})</>}
              {h.pct !== null && <> · {h.pct}%</>}
              {h.levelNum !== null && <> · L{h.levelNum}</>}
              {<> · {h.wallet} wallet</>}
            </p>
            <p className="mt-0.5 break-words text-[11px] text-slate-500">{h.detail}</p>
          </div>
        ))}
        {!shown.length && !failed && <p className="py-6 text-center text-sm text-slate-400">No records yet.</p>}
        {failed && (
          <div className="py-6 text-center">
            <p className="text-sm text-slate-400">Couldn't load history (network hiccup).</p>
            <button onClick={load} className="mt-2 rounded-xl bg-yellow-300 px-5 py-2 text-sm font-black text-black">Retry</button>
          </div>
        )}
      </div>
      {list.length > 20 && (
        <button onClick={() => setShowAll((v) => !v)} className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold text-yellow-200">
          {showAll ? "Show less" : `View all (${list.length})`}
        </button>
      )}
    </div>
  );
}
