"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Kpi {
  key: string;
  label: string;
  value: number;
  target: number;
  done: boolean;
  pct: number;
}

export default function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [d, setD] = useState<{
    campaign?: { name?: string; location?: string; meeting_date?: string; eligibility_end?: string };
    kpis?: Kpi[]; leadershipOk?: boolean; selfOk?: boolean; achieved?: boolean;
    metrics?: { self?: number; direct?: number; teamL2_10?: number };
    criteria?: { leadership?: { self?: number; teamL2_10?: number; direct?: number }; selfPath?: { self?: number; direct?: number } };
    leaderboard?: { name?: string; country?: string; user_code?: string; earned?: number; is_demo?: number }[];
  } | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`).then((r) => r.json()).then((j) => {
      if (j.ok) { setD(j); if (j.achieved) setToast(true); }
    });
  }, [id]);

  async function dismiss() {
    await fetch("/api/campaigns/dismiss", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaign_id: id }) });
    setToast(false);
  }

  const L = d?.criteria?.leadership;
  const S = d?.criteria?.selfPath;
  const m = d?.metrics || {};

  return (
    <div className="space-y-3">
      <Link href="/dash/campaigns" className="text-xs text-slate-300">← All campaigns</Link>
      <div className="av-card p-4">
        <h2 className="text-xl font-black">🏆 {d?.campaign?.name}</h2>
        <p className="text-sm text-slate-300">📍 {d?.campaign?.location} · Meeting {d?.campaign?.meeting_date}</p>
        <p className="text-xs text-slate-400">Last eligibility date: {d?.campaign?.eligibility_end}</p>
      </div>

      {toast && d?.achieved && (
        <div className="rounded-2xl border border-emerald-300/50 bg-emerald-900/40 p-4 text-center">
          <p className="text-lg font-black text-emerald-300">🎉 Ticket Achieved!</p>
          <p className="text-sm">You earned the {d?.campaign?.name} with ${Number(m.self).toFixed(0)}+ self and ${Number(m.direct).toFixed(0)}+ direct business.</p>
          <button onClick={dismiss} className="mt-2 rounded-lg bg-emerald-300 px-4 py-1 text-sm font-bold text-black">OK</button>
        </div>
      )}

      <h3 className="font-bold">KPI Progress</h3>
      {(d?.kpis || []).map((k) => (
        <div key={k.key} className="av-card p-3">
          <div className="flex items-center justify-between text-sm">
            <span>{k.label}: <b>${k.value.toFixed(0)} / ${k.target.toLocaleString()}</b></span>
            {k.done && <span className="done-badge">DONE</span>}
          </div>
          <div className="progress"><div className="progress-fill" style={{ width: `${k.pct}%` }} /></div>
        </div>
      ))}

      <div className="av-card p-4">
        <h3 className="font-bold">Leadership Criteria {d?.leadershipOk && <span className="done-badge">DONE</span>}</h3>
        <p className="mt-1 text-sm text-slate-300">Self ${L?.self?.toLocaleString()}+ · L2–L10 Team ${L?.teamL2_10?.toLocaleString()}+ · Direct ${L?.direct?.toLocaleString()}+</p>
        <p className="text-sm">My: Self ${Number(m.self).toFixed(0)} · Team ${Number(m.teamL2_10).toFixed(0)} · Direct ${Number(m.direct).toFixed(0)}</p>
      </div>
      <div className="av-card p-4">
        <h3 className="font-bold">Self Criteria {d?.selfOk && <span className="done-badge">DONE</span>}</h3>
        <p className="mt-1 text-sm text-slate-300">Self ${S?.self?.toLocaleString()}+ AND Direct ${S?.direct?.toLocaleString()}+</p>
      </div>
      <p className="text-center text-xs text-slate-400">Either criteria can achieve the ticket.</p>

      <div className="av-card p-4">
        <h3 className="font-bold">🌟 Achievers Leaderboard</h3>
        <div className="mt-2 space-y-1 text-xs">
          {(d?.leaderboard || []).map((a, i) => (
            <p key={i} className="flex justify-between rounded bg-black/30 px-2 py-1.5">
              <span>#{i + 1} <b>{a.name}</b> · {a.country} · {a.user_code}{a.is_demo ? " (demo)" : ""}</span>
              <b className="text-yellow-300">${Number(a.earned).toLocaleString()}</b>
            </p>
          ))}
          {!(d?.leaderboard || []).length && <p className="text-slate-400">No achievers yet. Be the first!</p>}
        </div>
      </div>
    </div>
  );
}
