"use client";
import { useEffect, useState } from "react";
export default function Profile() {
  const [d, setD] = useState<{ user?: Record<string, string>; wallet?: Record<string, number> } | null>(null);
  const [bep, setBep] = useState("");
  const [country, setCountry] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { fetch("/api/me").then((r) => r.json()).then((j) => { if (j.ok) { setD(j); setBep(String(j.user?.bep20_address || "")); setCountry(String(j.user?.country || "")); } }); }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bep20_address: bep, country }) });
    const j = await r.json();
    setMsg(j.ok ? "Profile saved" : j.error);
  }
  const refLink = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${d?.user?.referral_code}` : "";
  return (<div className="space-y-3"><div className="av-card p-4"><h2 className="font-black">Profile</h2><p className="text-sm">Name: {d?.user?.name} · ID {d?.user?.referral_code} · {String(d?.user?.rank)} · KYC {String(d?.user?.kyc_status)}</p><p className="mt-1 text-xs break-all text-slate-400">Referral link: {refLink}</p><p className="text-sm">Principal ${Number(d?.wallet?.principal || 0).toFixed(2)} · ROI ${Number(d?.wallet?.roi || 0).toFixed(2)} · Commission ${Number(d?.wallet?.commission || 0).toFixed(2)} · Reward ${Number(d?.wallet?.reward || 0).toFixed(2)}</p></div><div className="av-card space-y-2 p-4"><h3 className="font-bold">BEP-20 + Country</h3><form onSubmit={save} className="flex flex-col gap-2"><input className="av-input" value={bep} onChange={(e) => setBep(e.target.value)} placeholder="0x... BEP20 address" /><input className="av-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country (for campaign leaderboard)" /><button className="av-btn-yellow px-4 py-2">Save</button></form>{msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}</div></div>);
}
