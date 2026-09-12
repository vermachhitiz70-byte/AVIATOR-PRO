"use client";
import { useEffect, useState } from "react";
export default function Support() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<{ subject?: string; message?: string; status?: string; created_at?: string }[]>([]);
  const [msg, setMsg] = useState("");
  async function load() { const j = await fetch("/api/support").then((r) => r.json()); if (j.ok) setRows(j.rows); }
  useEffect(() => { load(); }, []);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message }) });
    const j = await r.json();
    setMsg(j.ok ? "Ticket opened. AI Help: check Business Plan + Terms for instant answers." : j.error);
    if (j.ok) { setSubject(""); setMessage(""); load(); }
  }
  return (<div className="space-y-3"><div className="av-card p-4"><h2 className="font-black">AI Help Desk (Enabled)</h2><p className="text-sm text-slate-300">Ask about recharge, bot plans, ROI levels, capping, withdrawals.</p></div><div className="av-card p-4"><h3 className="font-bold">Support tickets</h3><form onSubmit={send} className="mt-2 space-y-2"><input className="av-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required /><textarea className="av-input" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} required /><button className="av-btn-yellow w-full py-2">Send</button></form>{msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}<div className="mt-2 space-y-1">{rows.map((r, i) => <div key={i} className="rounded bg-black/30 p-2 text-xs"><b>{r.subject}</b> · {r.status} · {String(r.created_at).slice(0, 16).replace("T", " ")}</div>)}</div></div></div>);
}
