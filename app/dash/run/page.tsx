"use client";
import { useState } from "react";
export default function Run() {
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<{ round_no?: number; pct?: number; roi_amount?: number }[]>([]);
  async function play() {
    setMsg("Running...");
    const r = await fetch("/api/gameplay/run", { method: "POST" });
    const j = await r.json();
    setMsg(j.ok ? `Round ${j.round}: ${j.pct}% → +$${j.roi}` : j.error);
    if (j.ok) setLog((l) => [{ round_no: j.round, pct: j.pct, roi_amount: j.roi }, ...l].slice(0, 10));
  }
  return (<div className="space-y-3"><div className="av-card p-4"><h2 className="font-black">✈ Play Aviator / LUDO247</h2><p className="text-sm text-slate-300">10 runs/day, 0–2% each, needs active bot. Demo credits instantly + pays 10-level ROI.</p><button onClick={play} className="av-btn-red mt-3 w-full py-3">Run / Play Now</button>{msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}</div><div className="av-card p-4"><h3 className="font-bold">Recent runs</h3>{log.map((l, i) => <p key={i} className="text-sm">Round {l.round_no}: {l.pct}% → +${l.roi_amount}</p>)}</div></div>);
}
