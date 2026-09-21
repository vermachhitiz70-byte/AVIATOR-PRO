"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FakeNotifications, LiveToasts } from "@/components/dash";

const TILES = [
  { href: "/dash/recharge", label: "Recharge", icon: "💰", g: "from-amber-300 to-orange-500" },
  { href: "/dash/play", label: "Trade", icon: "📈", g: "from-emerald-300 to-green-600" },
  { href: "/dash/withdraw", label: "Withdraw", icon: "💸", g: "from-sky-300 to-blue-600" },
  { href: "/dash/team", label: "Team", icon: "👥", g: "from-violet-300 to-purple-600" },
  { href: "/dash/bot", label: "Trading Bot", icon: "🤖", g: "from-slate-300 to-slate-600" },
  { href: "/dash/business-plan", label: "Business Plan", icon: "📋", g: "from-yellow-200 to-amber-500" },
  { href: "/dash/run", label: "LUDO247", icon: "🎲", g: "from-red-300 to-rose-600" },
  { href: "/dash/support", label: "AI Help", icon: "✨", g: "from-cyan-200 to-teal-500" },
  { href: "/dash/support", label: "Support", icon: "🎧", g: "from-indigo-300 to-indigo-600" },
  { href: "/dash/campaigns", label: "Campaigns", icon: "🏆", g: "from-orange-300 to-yellow-600" },
];

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
  feed?: { kind: string; message: string }[];
}

const num = (v: unknown) => Number(v || 0);

export default function DashHome() {
  const router = useRouter();
  const [data, setData] = useState<MeData | null>(null);
  const [gate, setGate] = useState<null | "pending" | "checking">(null);
  const [fresh, setFresh] = useState<{ campaign_id?: string; name?: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadMe(retried = false): Promise<void> {
      let r: Response;
      try {
        r = await fetch("/api/me");
      } catch {
        if (!retried && !cancelled) { setTimeout(() => loadMe(true), 1500); return; }
        window.location.href = "/login";
        return;
      }
      if (r.status === 401) {
        // One retry: a cold server can drop the first request right after login.
        if (!retried && !cancelled) {
          await new Promise((res) => setTimeout(res, 1200));
          if (!cancelled) await loadMe(true);
          return;
        }
        window.location.href = "/login";
        return;
      }
      const j = await r.json();
      // Hard gate fallback: no confirmed investment + no active bot => /activate (server layout is primary)
      if ((!j.totalInvestment || j.totalInvestment === 0) && !j.activeBot) {
        setGate("checking");
        router.replace("/activate");
        return;
      }
      setData(j);
    }
    loadMe();
    fetch("/api/campaigns").then((r) => r.json()).then((j) => {
      if (j.ok && j.fresh) setFresh(j.fresh);
    });
    return () => { cancelled = true; };
  }, [router]);

  const name = data?.user?.name || "...";
  const uid = data?.user?.referral_code || "";
  const rank = data?.user?.rank || "Starter";

  const botPlan = data?.activeBot ? String(data.activeBot.plan || "") : "None";
  const toasts = (data?.feed || []).slice(0, 2).map((f) => ({
    kind: String(f.kind).toUpperCase(),
    message: String(f.message),
    time: "Just now",
  }));
  if (gate === "checking") {
    return (
      <div className="av-card p-8 text-center">
        <p className="text-3xl">⏳</p>
        <h3 className="mt-2 font-black">Checking activation...</h3>
        <p className="mt-1 text-sm text-slate-400">Taking you to plan activation.</p>
        <Link href="/activate" className="av-btn-yellow mt-4 inline-block px-6 py-2">Go to Activate</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnnounceBanner />
      <WithdrawBanner />
      <LiveToasts items={toasts} />
      <FakeNotifications />
      {fresh.map((f) => (
        <Link key={f.campaign_id} href={`/dash/campaigns/${f.campaign_id}`} className="block rounded-2xl border border-emerald-300/50 bg-emerald-900/40 p-3 text-center text-sm font-bold text-emerald-200">
          Ticket Achieved: {f.name} — tap to view
        </Link>
      ))}
      <div className="hero-plane av-card relative overflow-hidden p-4">
        <img
          src="https://mb.cision.com/Public/21505/4215485/9f73e17c89d7f9d0_800x800ar.png"
          alt="" aria-hidden="true"
          className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-2xl object-cover opacity-40"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div className="relative z-10">
        <span className="live-pill">AVIATOR LIVE</span>
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
      </div>
      <ReferralStrip code={uid} />
      <div className="grid grid-cols-3 gap-2">
        {TILES.map((t) => (
          <Link key={t.label} href={t.href} className="av-card flex flex-col items-center py-4 text-sm font-semibold transition hover:-translate-y-0.5">
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-lg ${t.g}`}>{t.icon}</span>
            <span className="mt-2">{t.label}</span>
          </Link>
        ))}
      </div>
      <EarningsStrip />
      <WalletCards />
      <CappingMeter />
      <div className="grid grid-cols-2 gap-2 text-sm">
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
      <Link href="/dash/history" className="av-card flex items-center justify-between p-4 text-sm font-bold">
        <span>Transaction History <span className="font-normal text-slate-400">— deposits, withdrawals, ROI, level</span></span>
        <span className="text-yellow-300">View all →</span>
      </Link>
    </div>
  );
}

function EarningsStrip() {
  const [r, setR] = useState<Record<string, { total: number }> | null>(null);
  const [invested, setInvested] = useState(0);
  const [teamBiz, setTeamBiz] = useState(0);
  useEffect(() => {
    fetch("/api/earnings").then((x) => x.json()).then((j) => { if (j.ok) { setR(j.ranges); setInvested(Number(j.invested || 0)); } }).catch(() => {});
    fetch("/api/team").then((x) => x.json()).then((j) => { if (j.ok) setTeamBiz(Number(j.team || 0)); }).catch(() => {});
  }, []);
  const cells: [string, string][] = [["today", "Today"], ["week", "7 Days"], ["month", "30 Days"], ["all", "Total"]];
  const totalEarned = num(r?.all?.total);
  return (
    <div className="av-card p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Earnings — Daily ROI + Level + Reward</p>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {cells.map(([k, label]) => (
          <div key={k} className="rounded-xl bg-black/40 px-1 py-2">
            <p className="text-[10px] text-slate-400">{label}</p>
            <p className="text-sm font-black text-emerald-300">+{num(r?.[k]?.total).toFixed(2)}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-1 py-2">
          <p className="text-[10px] font-bold text-red-300">My Earnings</p>
          <p className="text-sm font-black text-red-200">+${totalEarned.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-1 py-2">
          <p className="text-[10px] font-bold text-yellow-300">Team Business</p>
          <p className="text-sm font-black text-yellow-200">${teamBiz.toFixed(0)}</p>
        </div>
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-1 py-2">
          <p className="text-[10px] font-bold text-red-300">Total Amount</p>
          <p className="text-sm font-black text-red-200">${(invested + totalEarned).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function CappingMeter() {
  const [bots, setBots] = useState<{ id?: string; plan?: string; amount?: number; cap?: number; capUsed?: number; capLeft?: number; status?: string }[]>([]);
  useEffect(() => {
    fetch("/api/me").then((x) => x.json()).then((j) => { if (j.ok) setBots(j.bots || (j.activeBot ? [j.activeBot] : [])); }).catch(() => {});
  }, []);
  if (!bots.length) return null;
  return (
    <div className="av-card space-y-2.5 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Capping — bot income + rewards count · full = all incomes stop</p>
      {bots.map((b, i) => {
        const cap = num(b.cap);
        const used = num(b.capUsed);
        const left = num(b.capLeft);
        const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
        const full = b.status === "capped" || (cap > 0 && left <= 0);
        return (
          <div key={b.id || i} className="rounded-xl bg-black/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Bot #{i + 1} · {String(b.plan)} ${num(b.amount).toFixed(0)}</span>
              {full ? <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-black text-red-300">FULL — incomes stopped</span>
                : <span className="text-slate-300">Cap ${cap.toFixed(0)} · Earned ${used.toFixed(2)} · <b className="text-emerald-300">Left ${left.toFixed(2)}</b></span>}
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all ${full ? "bg-red-400" : "bg-gradient-to-r from-yellow-300 to-emerald-300"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WalletCards() {
  const [wlts, setWlts] = useState<{ key: string; label: string; desc: string; withdrawable: boolean; balance: number; lifetimeInflow: number }[]>([]);
  useEffect(() => {
    fetch("/api/wallets").then((x) => x.json()).then((j) => { if (j.ok) setWlts(j.wallets); }).catch(() => {});
  }, []);
  if (!wlts.length) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {wlts.map((w) => (
        <div key={w.key} className="av-card p-3">
          <p className="text-slate-400">{w.label} {!w.withdrawable && <span title={w.desc}>🔒</span>}</p>
          <p className="font-bold">${num(w.balance).toFixed(2)}</p>
          <p className="text-[11px] text-slate-500">Lifetime +${num(w.lifetimeInflow).toFixed(2)}{!w.withdrawable && " · locked"}</p>
        </div>
      ))}
    </div>
  );
}

function AnnounceBanner() {
  const [rows, setRows] = useState<{ id: string; title: string; message: string }[]>([]);
  const [hidden, setHidden] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("av_hide_ann") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    fetch("/api/announcements").then((x) => x.json()).then((j) => { if (j.ok) setRows(j.rows || []); }).catch(() => {});
  }, []);
  function hide(id: string) {
    const next = [...hidden, id];
    setHidden(next);
    try { localStorage.setItem("av_hide_ann", JSON.stringify(next)); } catch { /* ignore */ }
  }
  const vis = rows.filter((r) => !hidden.includes(String(r.id)));
  if (!vis.length) return null;
  return (
    <div className="space-y-2">
      {vis.map((a) => (
        <div key={a.id} className="av-card flex items-start gap-2 border-yellow-300/40 p-3">
          <span className="text-lg">📢</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-yellow-200">{a.title}</p>
            <p className="text-xs text-slate-300">{a.message}</p>
          </div>
          <button onClick={() => hide(String(a.id))} aria-label="Dismiss" className="shrink-0 rounded-lg px-2 py-1 text-slate-400 hover:bg-white/10 hover:text-white">✕</button>
        </div>
      ))}
    </div>
  );
}

function WithdrawBanner() {
  const [row, setRow] = useState<{ status?: string; net?: number } | null>(null);
  useEffect(() => {
    fetch("/api/withdraw").then((x) => x.json()).then((j) => { if (j.ok && j.rows?.length) setRow(j.rows[0]); }).catch(() => {});
  }, []);
  if (!row) return null;
  if (row.status === "pending") {
    return (
      <div className="av-card border-amber-300/40 p-3 text-center">
        <p className="text-sm font-black text-amber-200">⏳ Withdrawal pending</p>
        <p className="text-xs text-slate-300">Your withdrawal request is awaiting approval.</p>
      </div>
    );
  }
  if (row.status === "approved") {
    return (
      <div className="av-card border-emerald-300/40 p-3 text-center">
        <p className="text-sm font-black text-emerald-300">✓ Withdrawal paid — ${Number(row.net || 0).toFixed(2)}</p>
        <p className="text-xs text-slate-300">The amount has been sent to your BEP20 address.</p>
      </div>
    );
  }
  return (
    <div className="av-card border-red-300/40 p-3 text-center">
      <p className="text-sm font-black text-red-300">Withdrawal rejected</p>
      <p className="text-xs text-slate-300">The amount has been refunded to your wallet. Please contact Support.</p>
    </div>
  );
}

function ReferralStrip({ code }: { code: string }) {
  const [copied, setCopied] = useState("");
  if (!code) return null;
  const link = typeof window !== "undefined" ? `${window.location.origin}/register?ref=${code}` : "";
  async function copy(what: "code" | "link") {
    const { copyText } = await import("@/lib/copy");
    const ok = await copyText(what === "code" ? code : link);
    setCopied(ok ? "Copied ✓ — send it to anyone" : "Copy failed — long-press the code to copy");
    setTimeout(() => setCopied(""), 2500);
  }
  return (
    <div className="av-card flex flex-wrap items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">My Referral Code</p>
        <p className="truncate font-mono text-lg font-black text-yellow-300">{code}</p>
      </div>
      <button onClick={() => copy("code")} className="shrink-0 rounded-lg bg-yellow-300 px-3 py-2 text-xs font-black text-black">Copy Code</button>
      <button onClick={() => copy("link")} className="shrink-0 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold">Copy Link</button>
      {copied && <p className="w-full text-xs font-bold text-emerald-300">{copied}</p>}
    </div>
  );
}


