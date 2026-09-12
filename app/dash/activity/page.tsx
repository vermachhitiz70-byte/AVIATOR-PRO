"use client";
import { useEffect, useState } from "react";
export default function Activity() {
  const [rows, setRows] = useState<{ type?: string; level?: number; pct?: number; amount?: number; created_at?: string }[]>([]);
  useEffect(() => { fetch("/api/activity").then((r) => r.json()).then((j) => { if (j.ok) setRows(j.rows); }); }, []);
  return (<div className="av-card p-4"><h2 className="font-black">Activity</h2><div className="mt-2 space-y-2">{rows.map((r, i) => <div key={i} className="rounded-lg bg-black/30 p-2 text-xs">{r.type} L{r.level} · {r.pct}% · +${Number(r.amount).toFixed(2)} · {String(r.created_at).slice(0, 16).replace("T", " ")}</div>)}{!rows.length && <p className="text-sm text-slate-400">No activity yet. Recharge + activate bot + run.</p>}</div></div>);
}
