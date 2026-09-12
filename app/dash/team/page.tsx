"use client";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

type Level = { level: number; members: { id: string; name: string; referral_code: string; investment: number }[] };

export default function Team() {
  const [d, setD] = useState<{ referralCode?: string; direct?: number; teamTotal?: number; self?: number; team?: number; levels?: Level[] } | null>(null);
  const [link, setLink] = useState("");
  useEffect(() => {
    fetch("/api/team").then((r) => r.json()).then((j) => {
      if (j.ok) {
        setD(j);
        setLink(`${window.location.origin}/register?ref=${j.referralCode}`);
      }
    });
  }, []);
  return (
    <div className="space-y-3">
      <div className="av-card p-4 text-center">
        <h2 className="font-black">My Network</h2>
        <p className="mt-1 break-all text-xs text-yellow-300">{link}</p>
        <div className="mt-2 flex justify-center bg-white p-2 rounded-xl">{link && <QRCodeSVG value={link} size={140} />}</div>
        <button onClick={() => { navigator.clipboard.writeText(link); }} className="mt-2 rounded-lg border border-white/20 px-4 py-2 text-sm">Copy referral link</button>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-black/40 p-2">Direct: <b>{d?.direct ?? "-"}</b></div>
          <div className="rounded-lg bg-black/40 p-2">Total team: <b>{d?.teamTotal ?? "-"}</b></div>
          <div className="rounded-lg bg-black/40 p-2">Self biz: <b>${Number(d?.self || 0).toFixed(0)}</b></div>
          <div className="rounded-lg bg-black/40 p-2">Team biz: <b>${Number(d?.team || 0).toFixed(0)}</b></div>
        </div>
      </div>
      {(d?.levels || []).map((l) => (
        <div key={l.level} className="av-card p-3">
          <h3 className="text-sm font-bold">Level {l.level} ({l.members.length})</h3>
          <div className="mt-1 space-y-1 text-xs">
            {l.members.map((m) => (<p key={m.id} className="flex justify-between rounded bg-black/30 px-2 py-1.5"><span>{m.name} · {m.referral_code}</span><span className="text-emerald-300">${m.investment.toFixed(0)}</span></p>))}
          </div>
        </div>
      ))}
      {!(d?.levels || []).length && <p className="text-center text-sm text-slate-400">No team yet. Share your link.</p>}
    </div>
  );
}
