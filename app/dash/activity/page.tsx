"use client";
import { useEffect, useState } from "react";

type Row = { kind?: string; wallet?: string; amount?: number; note?: string; created_at?: string };

// Client spec: income history shows Date, Time and Amount separately,
// categorized by income type (Direct, Reward, Level, ROI, Game, Deposit, Withdrawal).
const KIND_LABEL: Record<string, string> = {
  first_recharge: "Direct",
  reward: "Reward",
  roi_level: "Level",
  daily_roi: "ROI",
  game_profit: "Game",
  game_loss: "Game",
  deposit_confirm: "Deposit",
  withdraw_request: "Withdrawal",
  admin_credit: "Credit",
  admin_debit: "Debit",
};

function fmtDate(v: string) {
  const d = new Date(v.replace(" ", "T"));
  return isNaN(d.getTime()) ? v.slice(0, 10) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(v: string) {
  const d = new Date(v.replace(" ", "T"));
  return isNaN(d.getTime()) ? v.slice(11, 16) : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function Activity() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => { fetch("/api/ledger").then((r) => r.json()).then((j) => { if (j.ok) setRows(j.rows); }); }, []);
  return (
    <div className="av-card p-4">
      <h2 className="font-black">Income History</h2>
      <p className="text-xs text-slate-400">Date · Time · Amount, by income type. Withdrawals show debit (before) and net (after 10% deduction) in the note.</p>
      <div className="mt-2 space-y-2">
        {rows.map((r, i) => {
          const amt = Number(r.amount || 0);
          return (
            <div key={i} className="rounded-lg bg-black/30 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-yellow-200">{KIND_LABEL[String(r.kind)] || String(r.kind)}</span>
                <span className={amt >= 0 ? "font-black text-emerald-300" : "font-black text-red-300"}>
                  {amt >= 0 ? "+" : "−"}${Math.abs(amt).toFixed(2)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-slate-400">
                <span>{fmtDate(String(r.created_at))} · {fmtTime(String(r.created_at))}</span>
                <span className="truncate pl-2">{String(r.note || r.wallet || "")}</span>
              </div>
            </div>
          );
        })}
        {!rows.length && <p className="text-sm text-slate-400">No activity yet. Recharge + activate bot + play.</p>}
      </div>
    </div>
  );
}
