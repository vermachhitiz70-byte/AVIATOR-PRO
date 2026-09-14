"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LiveToasts } from "@/components/dash";

const TILES = [
  { href: "/dash/recharge", label: "Recharge", icon: "+" },
  { href: "/dash/play", label: "Trade", icon: ">" },
  { href: "/dash/withdraw", label: "Withdraw", icon: "$" },
  { href: "/dash/team", label: "Team", icon: "&" },
  { href: "/dash/bot", label: "Trading Bot", icon: "B" },
  { href: "/dash/business-plan", label: "Business Plan", icon: "P" },
  { href: "/dash/run", label: "LUDO247", icon: "D" },
  { href: "/dash/support", label: "AI Help", icon: "*" },
  { href: "/dash/support", label: "Support", icon: "?" },
  { href: "/dash/campaigns", label: "Campaigns", icon: "T" },
];

interface RecentTx {
  kind?: string;
  amount?: number;
  note?: string;
}

interface MeData {
  user?: { name?: string; referral_code?: string; rank?: string };
  available?: number;
  activeBot?: { plan?: string; expiry_date?: string } | null;
  todayEarnings?: number;
  totalInvestment?: number;
  totalWithdrawal?: number;
  direct?: number;
  teamTotal?: number;
  wallet?: { principal?: number; roi?: number; commission?: number; reward?: number };
  recentTx?: RecentTx[];
  feed?: { kind: string; message: string }[];
}

const num = (v: unknown) => Number(v || 0);

export default function DashHome() {
  const [data, setData] = useState<MeData | null>(null);

  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.status === 401) {
        window.location.href = "/login";
        return;
      }
      setData(await r.json());
    });
    fetch("/api/campaigns").then((r) => r.json()).then((j) => {
      if (j.ok && j.fresh) setFresh(j.fresh);
    });
  }, []);

  const name = data?.user?.name || "...";
  const uid = data?.user?.referral_code || "";
  const rank = data?.user?.rank || "Starter";
  const wallet = data?.wallet || {};
  const income = num(wallet.roi) + num(wallet.commission) + num(wallet.reward);
  const botPlan = data?.activeBot ? String(data.activeBot.plan || "") : "None";
  const toasts = (data?.feed || []).slice(0, 2).map((f) => ({
    kind: String(f.kind).toUpperCase(),
    message: String(f.message),
    time: "Just now",
  }));
  const txs = data?.recentTx || [];
  const [fresh, setFresh] = useState<{ campaign_id?: string; name?: string }[]>([]);

  return (
    <div className="space-y-3">
      <LiveToasts items={toasts} />
      {fresh.map((f) => (
        <Link key={f.campaign_id} href={`/dash/campaigns/${f.campaign_id}`} className="block rounded-2xl border border-emerald-300/50 bg-emerald-900/40 p-3 text-center text-sm font-bold text-emerald-200">
          Ticket Achieved: {f.name} — tap to view
        </Link>
      ))}
      <div className="hero-plane av-card overflow-hidden p-4">
        <span className="live-pill">CRYPTO LIVE</span>
        <h1 className="mt-2 text-2xl font-black">
          Ready to trade, {name}
        </h1>
        <p className="text-sm text-slate-300">
          User ID {uid} - {rank}
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/dash/play" className="av-btn-red px-4 py-2 text-sm">
            Start Trading
          </Link>
          <Link href="/dash/activity" className="rounded-xl border border-white/30 px-4 py-2 text-sm">
            Activity
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-black/60 px-4 py-2">
            <p className="text-xs text-slate-300">Available Balance</p>
            <p className="text-2xl font-black text-yellow-300">{num(data?.available).toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-black/60 px-4 py-2">
            <p className="text-xs text-slate-300">Today&apos;s Earnings</p>
            <p className="text-2xl font-black text-emerald-300">+{num(data?.todayEarnings).toFixed(2)}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((t) => (
          <Link key={t.label} href={t.href} className="av-card flex flex-col items-center py-4 text-sm font-semibold">
            <span className="text-xl">{t.icon}</span>
            <span className="mt-1">{t.label}</span>
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="av-card p-3">
          <p className="text-slate-400">Main (Principal)</p>
          <p className="font-bold">${num(wallet.principal).toFixed(2)}</p>
        </div>
        <div className="av-card p-3">
          <p className="text-slate-400">Income (ROI+Comm+Rew)</p>
          <p className="font-bold">${income.toFixed(2)}</p>
        </div>
        <div className="av-card p-3">
          <p className="text-slate-400">Total Investment</p>
          <p className="font-bold">${num(data?.totalInvestment).toFixed(2)}</p>
        </div>
        <div className="av-card p-3">
          <p className="text-slate-400">Total Withdrawal</p>
          <p className="font-bold">${num(data?.totalWithdrawal).toFixed(2)}</p>
        </div>
        <div className="av-card p-3">
          <p className="text-slate-400">Direct / Team</p>
          <p className="font-bold">
            {data?.direct ?? "-"} / {data?.teamTotal ?? "-"}
          </p>
        </div>
        <div className="av-card p-3">
          <p className="text-slate-400">Active Bot</p>
          <p className="font-bold">{botPlan}</p>
        </div>
      </div>
      <div className="av-card p-3 text-sm">
        <p className="text-slate-400">Recent Transactions</p>
        <div className="mt-1 space-y-1">
          {txs.map((t, i) => (
            <TxRow key={i} tx={t} />
          ))}
          {txs.length === 0 && <p className="text-xs text-slate-500">No transactions yet.</p>}
        </div>
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: RecentTx }) {
  const amt = num(tx.amount);
  const good = amt >= 0;
  return (
    <p className="flex justify-between rounded bg-black/30 px-2 py-1 text-xs">
      <span>
        {tx.kind} - {tx.note}
      </span>
      <b className={good ? "text-emerald-300" : "text-red-300"}>
        {good ? "+" : ""}
        {amt.toFixed(2)}
      </b>
    </p>
  );
}
