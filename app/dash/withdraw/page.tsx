"use client";
import { useEffect, useState } from "react";

const WALLET_LABELS: Record<string, string> = { roi: "Daily ROI Income", commission: "Level / Direct Income", reward: "Reward Income" };

export default function Withdraw() {
  const [amount, setAmount] = useState("10");
  const [savedAddr, setSavedAddr] = useState("");
  const [wallet, setWallet] = useState("commission");
  const [msg, setMsg] = useState("");
  const [rows, setRows] = useState<{ usd?: number; debit?: number; charge?: number; net?: number; status?: string; source_wallet?: string; payout_tx?: string }[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({ roi: 0, commission: 0, reward: 0 });
  const [minW, setMinW] = useState(2);
  const [maxW, setMaxW] = useState(25000);
  const [winOk, setWinOk] = useState(true);
  const [winNow, setWinNow] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  async function load() {
    fetch("/api/me").then((r) => r.json()).then((m) => { if (m.ok) setSavedAddr(String(m.user?.bep20_address || "")); }).catch(() => {});
    const j = await fetch("/api/withdraw").then((r) => r.json());
    if (j.ok) {
      setRows(j.rows); setBalances(j.balances || { roi: 0, commission: 0, reward: 0 });
      setMinW(j.min ?? 2); setMaxW(j.maxLimit ?? 25000);
      setWinOk(j.window?.ok ?? true); setWinNow(j.window?.nowIST ?? "");
    }
  }
  useEffect(() => { load(); }, []);
  const selBal = Number(balances[wallet] ?? 0);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Client rule: outside the window nothing goes to admin — just a popup.
    if (!winOk) { setShowClosed(true); return; }
    if (!savedAddr) { setMsg("Save your BEP20 payout address in Profile first."); return; }
    setMsg("Submitting...");
    const r = await fetch("/api/withdraw", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), wallet }) });
    const j = await r.json();
    if (!j.ok && String(j.error || "").includes("8:00")) { setShowClosed(true); setMsg(""); return; }
    if (j.ok) {
      await load();
      const left = await fetch("/api/withdraw").then((x) => x.json()).then((k) => (k.ok ? Number(k.balances?.[wallet] ?? 0) : null)).catch(() => null);
      setMsg(`Submitted from ${WALLET_LABELS[wallet]}. Debit ${j.debit}, Charge ${j.charge}, Net $${j.net}${left !== null ? ` · Remaining ${WALLET_LABELS[wallet]} balance: $${left.toFixed(2)}` : ""}`);
    } else setMsg(j.error);
  }
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-pink-100 p-3 text-sm text-black">Verify your BEP-20 address by email OTP in Profile.</div>
      <div className={`rounded-lg p-3 text-sm ${winOk ? "bg-emerald-100 text-black" : "bg-amber-100 text-black"}`}>
        {winOk ? `Withdrawals OPEN now (${winNow}). Window: 8:00–10:00 AM daily. One withdrawal per day.` : `Withdrawals CLOSED now (${winNow}). Window: 8:00–10:00 AM daily — please try again tomorrow.`}
      </div>
      <div className="av-card p-4">
        <label className="text-sm">Select Wallet (earning wallets only)</label>
        <select className="av-input mt-1" value={wallet} onChange={(e) => setWallet(e.target.value)}>
          {(["roi", "commission", "reward"] as const).map((k) => (
            <option key={k} value={k}>{WALLET_LABELS[k]} — ${Number(balances[k] ?? 0).toFixed(2)}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-400">Deposit (Principal) wallet can never be withdrawn.</p>
        <label className="mt-3 block text-sm">Amount USD / USDT</label>
        <input className="av-input mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <p className="mt-1 text-xs text-slate-400">Selected balance: ${selBal.toFixed(2)} (min ${minW}, max ${maxW.toLocaleString()}, 10% deduction, window 8–10 AM, 1/day)</p>
        <div className="mt-2 rounded-xl bg-black/40 px-3 py-2.5 text-xs">
          <p className="text-slate-400">Payout goes automatically to your saved BEP20:</p>
          <p className="mt-0.5 break-all font-mono font-bold text-yellow-300">{savedAddr || "— not saved yet —"}</p>
          <a href="/dash/profile" className="mt-1 inline-block font-bold text-sky-300 underline">Set / change in Profile →</a>
        </div>
        <button onClick={submit} className="av-btn-yellow mt-3 w-full py-3">Submit Withdrawal</button>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
      </div>
      {/* Desktop: full table. Mobile: stacked cards below (no sideways scroll). */}
      <div className="av-card hidden overflow-x-auto p-4 md:block">
        <table className="av-table"><thead><tr><th>USD</th><th>Wallet</th><th>Wallet Debit</th><th>Charge</th><th>Net USDT</th><th>Status</th><th>Payout TX</th></tr></thead><tbody>{rows.map((r, i) => (<tr key={i}><td>${Number(r.usd).toFixed(2)}</td><td>{String(r.source_wallet || "-")}</td><td>{Number(r.debit).toFixed(2)}</td><td>{Number(r.charge).toFixed(2)}</td><td>${Number(r.net).toFixed(2)}</td><td>{r.status}</td><td className="font-mono text-[11px]">{r.payout_tx ? String(r.payout_tx).slice(0, 10) + "…" : "—"}</td></tr>))}</tbody></table>
        {!rows.length && <p className="py-4 text-center text-sm text-slate-400">No withdrawals yet.</p>}
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((r, i) => {
          const st = String(r.status || "");
          const chip = st === "approved" ? "bg-emerald-400/15 text-emerald-300" : st === "rejected" ? "bg-red-400/15 text-red-300" : "bg-yellow-300/15 text-yellow-300";
          return (
            <div key={i} className="av-card px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <b className="text-lg text-emerald-300">${Number(r.net).toFixed(2)}</b>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${chip}`}>{st || "—"}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">USD</p><p className="text-xs font-bold">${Number(r.usd).toFixed(2)}</p></div>
                <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">Debit</p><p className="text-xs font-bold">{Number(r.debit).toFixed(2)}</p></div>
                <div className="rounded-lg bg-black/40 px-1 py-1.5"><p className="text-[10px] text-slate-400">Charge</p><p className="text-xs font-bold">{Number(r.charge).toFixed(2)}</p></div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">{WALLET_LABELS[String(r.source_wallet || "")] || String(r.source_wallet || "—")}</p>
              <p className="mt-0.5 break-all font-mono text-[11px] text-slate-500">{r.payout_tx ? String(r.payout_tx) : "Payout TX pending"}</p>
            </div>
          );
        })}
        {!rows.length && <p className="py-6 text-center text-sm text-slate-400">No withdrawals yet.</p>}
      </div>
      {showClosed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowClosed(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-[#111827] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-4xl">⏰</p>
            <h3 className="mt-2 text-lg font-black text-white">Withdrawals Closed</h3>
            <p className="mt-2 text-sm text-slate-300">Please try again on the next date during the withdrawal window.</p>
            <p className="mt-1 text-sm font-bold text-yellow-300">8:00 – 10:00 AM (daily)</p>
            <button onClick={() => setShowClosed(false)} className="av-btn-yellow mt-4 w-full py-2.5 text-sm">OK, Got It</button>
          </div>
        </div>
      )}
    </div>
  );
}
