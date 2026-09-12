"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Campaigns() {
  const [rows, setRows] = useState<{ id?: string; name?: string; location?: string; meeting_date?: string; eligibility_end?: string; status?: string }[]>([]);
  useEffect(() => {
    fetch("/api/campaigns").then((r) => r.json()).then((j) => { if (j.ok) setRows(j.rows); });
  }, []);
  return (
    <div className="space-y-3">
      <h2 className="font-black">🏆 Campaigns & Achievers</h2>
      {rows.map((c) => (
        <Link key={c.id} href={`/dash/campaigns/${c.id}`} className="av-card block p-4">
          <h3 className="font-black">{c.name}</h3>
          <p className="text-sm text-slate-300">📍 {c.location} · Meeting {c.meeting_date}</p>
          <p className="text-xs text-slate-400">Eligible till {c.eligibility_end} · {c.status}</p>
        </Link>
      ))}
      {!rows.length && <p className="text-sm text-slate-400">No campaigns yet.</p>}
    </div>
  );
}
