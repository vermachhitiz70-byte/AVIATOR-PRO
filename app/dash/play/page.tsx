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

function genCrash(): number {
  const r = Math.random();
  if (r < 0.03) return 1.0;
  return Math.min(30, Math.floor((0.97 / (1 - r)) * 100) / 100);
}

const RATE = 0.15; // multiplier curve steepness
const COUNTDOWN = 5;
const CRASH_PAUSE = 3;

type Phase = "countdown" | "flying" | "crashed";

export default function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState<FeedItem[]>([randomFeed(), randomFeed(), randomFeed(), randomFeed()]);
  const [stake, setStake] = useState("10");
  const [used, setUsed] = useState(0);
  const [limit] = useState(10);
  const [deposit, setDeposit] = useState(0);
  const [trades, setTrades] = useState<MyTrade[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [result, setResult] = useState<string>("");

  // round engine (refs = truth, state = mirror for paint)
  const R = useRef({ phase: "countdown" as Phase, t: COUNTDOWN, elapsed: 0, crash: genCrash(), cashed: null as number | null, bet: 0 as number | null, resolved: true, points: [] as { x: number; y: number }[] });
  const [, setTick] = useState(0);
  const usedRef = useRef(0);
  usedRef.current = used;

  async function refresh() {
    const j = await fetch("/api/gameplay/history").then((r) => r.json()).catch(() => null);
    if (j?.ok) { setTrades(j.today); setUsed(j.used); setDeposit(j.depositBalance || 0); }
  }
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const t = setInterval(() => setFeed((f) => [randomFeed(), ...f].slice(0, 12)), 3000);
    return () => clearInterval(t);
  }, []);

  // resolve a finished round (cash-out or crash) — display only, zero money
  async function resolve(crashedAt: number, cashedAt: number | null, bet: number) {
    const r = await fetch("/api/gameplay/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet, crashed_at: crashedAt, cashed_at: cashedAt }) });
    const j = await r.json().catch(() => ({ ok: false }));
    if (j.ok) {
      setUsed(limit - j.chancesLeft);
      setResult(cashedAt !== null ? `Cashed @ ${cashedAt.toFixed(2)}x → +$${j.delta.toFixed(2)} (demo)` : `Crashed @ ${crashedAt.toFixed(2)}x → −$${Math.abs(j.delta).toFixed(2)} (demo)`);
      refresh();
    } else setResult(j.error || "Round over");
  }

  // main loop
  useEffect(() => {
    const iv = setInterval(() => {
      const s = R.current;
      if (s.phase === "countdown") {
        s.t -= 0.1;
        if (s.t <= 0) { s.phase = "flying"; s.elapsed = 0; s.crash = genCrash(); s.cashed = null; s.resolved = s.bet === null; s.points = []; }
      } else if (s.phase === "flying") {
        s.elapsed += 0.1;
        const crashT = Math.log(s.crash) / RATE;
        if (s.elapsed >= crashT) {
          s.phase = "crashed"; s.t = CRASH_PAUSE;
          setHistory((h) => [s.crash, ...h].slice(0, 12));
          if (s.bet !== null && !s.resolved) { s.resolved = true; const b = s.bet; s.bet = null; resolve(s.crash, s.cashed, b); }
          else { s.bet = null; setResult(`Crashed @ ${s.crash.toFixed(2)}x — no bet placed`); }
        }
      } else {
        s.t -= 0.1;
        if (s.t <= 0) { s.phase = "countdown"; s.t = COUNTDOWN; s.bet = null; s.cashed = null; s.resolved = true; setResult(""); }
      }
      setTick((x) => x + 1);
    }, 100);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // paint
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const s = R.current;
    const W = (cv.width = cv.offsetWidth || 300);
    const H = (cv.height = 200);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(6,11,22,0.6)";
    ctx.fillRect(0, 0, W, H);
    const mult = s.phase === "flying" ? Math.exp(RATE * s.elapsed) : s.phase === "crashed" ? s.crash : 1;
    if (s.phase === "countdown") {
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Starting in ${Math.max(1, Math.ceil(s.t))}…`, W / 2, H / 2 - 6);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.fillText(s.bet !== null ? `Bet $${s.bet} locked — good luck!` : "Place your bet below", W / 2, H / 2 + 18);
    } else {
      const maxM = Math.max(s.crash, mult, 2);
      const crashT = Math.log(s.crash) / RATE;
      const prog = Math.min(1, s.elapsed / Math.max(crashT, 0.01));
      const px = 20 + prog * (W - 50);
      const py = H - 20 - ((mult - 1) / (maxM - 1)) * (H - 50);
      s.points.push({ x: px, y: py });
      if (s.points.length > 120) s.points.shift();
      ctx.strokeStyle = s.phase === "crashed" ? "#ef4444" : "#ff3b3b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.font = "20px sans-serif";
      ctx.fillText("✈️", px - 6, py - 6);
      ctx.fillStyle = s.phase === "crashed" ? "#ef4444" : "#facc15";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${mult.toFixed(2)}x`, 12, 34);
      if (s.phase === "crashed") {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`💥 CRASHED @ ${s.crash.toFixed(2)}x`, W / 2, H - 30);
      } else if (s.cashed !== null) {
        ctx.fillStyle = "#16a34a";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`Cashed @ ${s.cashed.toFixed(2)}x — waiting for crash…`, W / 2, H - 30);
      }
    }
    ctx.textAlign = "left";
  });

  function placeBet(e: React.FormEvent) {
    e.preventDefault();
    const s = R.current;
    if (s.phase !== "countdown" || s.bet !== null || usedRef.current >= limit) return;
    const st = Number(stake);
    if (!st || st < 0.1 || st > Math.max(deposit, 0.1)) { setResult(`Stake must be $0.10–$${deposit.toFixed(2)}`); return; }
    s.bet = st;
    s.resolved = false;
    setResult(`Bet $${st} placed — cash out before it crashes!`);
  }
  function cashOut() {
    const s = R.current;
    if (s.phase !== "flying" || s.bet === null || s.cashed !== null) return;
    s.cashed = Math.exp(RATE * s.elapsed);
  }

  const s = R.current;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">✈ Aviator <span className="text-xs font-bold text-slate-400">DEMO · winnings are virtual</span></h2>
        <Link href="/dash" className="text-xs text-slate-300">← Back</Link>
      </div>
      <div className="av-card overflow-hidden p-2">
        <canvas ref={canvasRef} className="h-[200px] w-full" />
        {history.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2 pb-2">
            {history.map((h, i) => (
              <span key={i} className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${h >= 2 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{h.toFixed(2)}x</span>
            ))}
          </div>
        )}
      </div>
      <div className="av-card p-4">
        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-300">Deposit: <b className="text-white">${deposit.toFixed(2)}</b></p>
          <p className="text-slate-300">Rounds: <b className="text-white">{used}/{limit}</b></p>
        </div>
        <form onSubmit={placeBet} className="mt-2 flex gap-2">
          <input className="av-input" value={stake} onChange={(e) => setStake(e.target.value)} placeholder={`Stake (min $0.10, max $${deposit.toFixed(2)})`} inputMode="decimal" />
          <button className="av-btn-red whitespace-nowrap px-5 disabled:opacity-50" disabled={s.phase !== "countdown" || s.bet !== null || used >= limit}>
            {s.bet !== null ? "Bet placed" : "Place Bet"}
          </button>
        </form>
        {s.phase === "flying" && s.bet !== null && s.cashed === null && (
          <button onClick={cashOut} className="av-btn-yellow mt-2 w-full py-3">Cash Out @ {Math.exp(RATE * s.elapsed).toFixed(2)}x</button>
        )}
        {result && <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-slate-200">{result}</p>}
        <p className="mt-1 text-xs text-slate-400">10 rounds/day · demo game — winnings never credit to any wallet. Real earnings come from your bot daily.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">Live Rounds</h3>
          <div className="mt-2 max-h-64 space-y-1 overflow-hidden text-xs">
            {feed.map((f, i) => (
              <p key={i} className="rounded bg-black/30 px-2 py-1.5"><b>{f.name}</b> bet ${f.bet} → <span className="text-emerald-300">+${f.profit}</span></p>
            ))}
          </div>
        </div>
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">My rounds today ({used}/{limit})</h3>
          <div className="mt-2 space-y-1 text-xs">
            {trades.map((b, i) => (
              <p key={i} className="rounded bg-black/30 px-2 py-1.5">
                Round {b.round_no}: ${Number(b.bet_amount).toFixed(2)} →{" "}
                <span className={Number(b.roi_amount) >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {Number(b.roi_amount) >= 0 ? "+" : "−"}${Math.abs(Number(b.roi_amount)).toFixed(2)}
                </span>
              </p>
            ))}
            {!trades.length && <p className="text-slate-400">No rounds yet today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
