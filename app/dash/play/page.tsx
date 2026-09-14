"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FEED_NAMES } from "@/lib/config";

const FOREIGN = ["John Carter", "Emily Watson", "David Miller", "Sarah Lee", "Michael Chen", "Anna Petrova", "James Wilson", "Maria Garcia", "Robert Smith", "Lisa Taylor", "Ahmed Hassan", "Fatima Khan", "Chen Wei", "Yuki Tanaka", "Oliver Brown"];
const GAME_FEED = [...FEED_NAMES.slice(0, 85), ...FOREIGN];

type FeedItem = { name: string; bet: string; profit: string };
type MyTrade = { round_no?: number; bet_amount?: number; roi_amount?: number; pct?: number };

function randomFeed(): FeedItem {
  const name = GAME_FEED[Math.floor(Math.random() * GAME_FEED.length)];
  const bet = (1 + Math.random() * 8).toFixed(2);
  const profit = (Number(bet) * (0.02 + Math.random() * 0.2)).toFixed(2);
  return { name, bet, profit };
}

type Candle = { o: number; h: number; l: number; c: number };
function newCandle(base: number): Candle {
  const o = base;
  const c = base + (Math.random() - 0.48) * base * 0.004;
  return { o, h: Math.max(o, c) + Math.random() * base * 0.0015, l: Math.min(o, c) - Math.random() * base * 0.0015, c };
}

export default function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const candlesRef = useRef<Candle[]>([]);
  const [price, setPrice] = useState(67432.1);
  const [feed, setFeed] = useState<FeedItem[]>([randomFeed(), randomFeed(), randomFeed(), randomFeed(), randomFeed()]);
  const [stake, setStake] = useState("1");
  const [used, setUsed] = useState(0);
  const [limit] = useState(10);
  const [balance, setBalance] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [result, setResult] = useState<{ delta: number; outcome: string; round: number } | null>(null);
  const [trades, setTrades] = useState<MyTrade[]>([]);

  // Live trader feed – new entry every 3 seconds (simulated)
  useEffect(() => {
    const t = setInterval(() => setFeed((f) => [randomFeed(), ...f].slice(0, 12)), 3000);
    return () => clearInterval(t);
  }, []);

  // Live crypto candlestick chart
  useEffect(() => {
    let base = 67432.1;
    candlesRef.current = Array.from({ length: 42 }, () => { const c = newCandle(base); base = c.c; return c; });
    let ticks = 0;
    const t = setInterval(() => {
      const arr = candlesRef.current;
      const last = arr[arr.length - 1];
      const move = (Math.random() - 0.48) * last.c * 0.0012;
      last.c += move;
      last.h = Math.max(last.h, last.c);
      last.l = Math.min(last.l, last.c);
      setPrice(last.c);
      if (++ticks % 6 === 0) { arr.push(newCandle(last.c)); if (arr.length > 48) arr.shift(); }
      const cv = canvasRef.current;
      if (!cv) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const W = (cv.width = cv.offsetWidth);
      const H = (cv.height = 360);
      ctx.clearRect(0, 0, W, H);
      const all = arr.flatMap((c) => [c.h, c.l]);
      const hi = Math.max(...all), lo = Math.min(...all), rg = Math.max(hi - lo, hi * 0.0005);
      const y = (v: number) => 20 + (1 - (v - lo) / rg) * (H - 50);
      ctx.strokeStyle = "rgba(148,178,255,.12)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 5) * i); ctx.lineTo(W, (H / 5) * i); ctx.stroke(); }
      const n = arr.length, cw = W / n, bw = Math.max(2, cw * 0.6);
      arr.forEach((c, i) => {
        const up = c.c >= c.o;
        ctx.strokeStyle = up ? "#16a34a" : "#ef4444";
        ctx.fillStyle = up ? "#16a34a" : "#ef4444";
        const x = i * cw + cw / 2;
        ctx.beginPath(); ctx.moveTo(x, y(c.h)); ctx.lineTo(x, y(c.l)); ctx.stroke();
        const t2 = y(Math.max(c.o, c.c)), b2 = y(Math.min(c.o, c.c));
        ctx.fillRect(x - bw / 2, t2, bw, Math.max(2, b2 - t2));
      });
      const lp = y(last.c);
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(250,204,21,.6)";
      ctx.beginPath(); ctx.moveTo(0, lp); ctx.lineTo(W, lp); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`$${last.c.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 10, Math.min(Math.max(lp - 8, 24), H - 8));
    }, 900);
    return () => clearInterval(t);
  }, []);

  async function refresh() {
    const j = await fetch("/api/gameplay/history").then((r) => r.json()).catch(() => null);
    if (j?.ok) { setTrades(j.today); setUsed(j.used); setBalance(j.earningBalance); setPnl(j.todayPnl); }
  }
  useEffect(() => { refresh(); }, []);

  async function startTrade(e: React.FormEvent) {
    e.preventDefault();
    if (resolving) return;
    setResolving(true);
    setResult(null);
    const t0 = Date.now();
    const r = await fetch("/api/gameplay/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet: Number(stake) }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Network error" }));
    const wait = Math.max(0, 1400 - (Date.now() - t0));
    setTimeout(() => {
      setResolving(false);
      if (!j.ok) { setResult(null); refresh(); return; }
      setResult({ delta: j.delta, outcome: j.outcome, round: j.round });
      setUsed(limit - j.chancesLeft);
      setBalance(j.earningBalance);
      setPnl(j.todayPnl);
      refresh();
    }, wait);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">🟢 Crypto Trading <span className="text-xs font-bold text-emerald-300">LIVE</span></h2>
        <Link href="/dash" className="text-xs text-slate-300">← Back</Link>
      </div>
      <div className="av-card overflow-hidden p-2">
        <div className="flex items-center justify-between px-2 pt-1">
          <p className="text-sm font-black">BTC / USDT</p>
          <p className="font-mono text-sm font-bold text-yellow-300">${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <canvas ref={canvasRef} className="h-[180px] w-full" />
      </div>
      <div className="av-card p-4">
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-300">Earning balance: <b className="text-white">${balance.toFixed(2)}</b></p>
          <p className="text-slate-300">Today: <b className={pnl >= 0 ? "text-emerald-300" : "text-red-300"}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</b></p>
        </div>
        <form onSubmit={startTrade} className="mt-2 flex gap-2">
          <input className="av-input" value={stake} onChange={(e) => setStake(e.target.value)} placeholder="Stake USD (min $0.10)" inputMode="decimal" />
          <button disabled={resolving || used >= limit} className="av-btn-red whitespace-nowrap px-5 disabled:opacity-50">
            {resolving ? "Trading..." : `Start Trade (${limit - used} left)`}
          </button>
        </form>
        {result && (
          <p className={`mt-2 rounded-lg px-3 py-2 text-sm font-bold ${result.outcome === "profit" ? "bg-emerald-500/15 text-emerald-300" : result.outcome === "loss" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-slate-200"}`}>
            Trade #{result.round}: {result.outcome === "profit" ? `+$${result.delta.toFixed(2)} profit` : result.outcome === "loss" ? `−$${Math.abs(result.delta).toFixed(2)} loss` : "No change"} — settled to ROI wallet
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">10 trades/day · stake from earning balance · results settle instantly.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">Live Traders</h3>
          <div className="mt-2 max-h-64 space-y-1 overflow-hidden text-xs">
            {feed.map((f, i) => (
              <p key={i} className="rounded bg-black/30 px-2 py-1.5"><b>{f.name}</b> traded ${f.bet} → <span className="text-emerald-300">+${f.profit} profit</span></p>
            ))}
          </div>
        </div>
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">My trades today ({used}/{limit})</h3>
          <div className="mt-2 space-y-1 text-xs">
            {trades.map((b, i) => (
              <p key={i} className="rounded bg-black/30 px-2 py-1.5">
                Trade {b.round_no}: ${Number(b.bet_amount).toFixed(2)} →{" "}
                <span className={Number(b.roi_amount) >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {Number(b.roi_amount) >= 0 ? "+" : "−"}${Math.abs(Number(b.roi_amount)).toFixed(2)}
                </span>
              </p>
            ))}
            {!trades.length && <p className="text-slate-400">No trades yet today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
