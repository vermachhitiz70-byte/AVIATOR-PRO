"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FEED_NAMES, FEED_NAMES_FOREIGN } from "@/lib/config";

const GAME_FEED = [...FEED_NAMES, ...FEED_NAMES_FOREIGN];

type FeedItem = { name: string; bet: string; profit: string };

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

// Where our money works — dummy showcase carousel (display only)
const PARTNERS: [string, string, string, string][] = [
  ["A", "Aviator", "from-red-500 to-orange-500", "Invested $5 Lakh"],
  ["R", "Rummy", "from-violet-400 to-purple-600", "Invested $2 Lakh"],
  ["C", "Casino Royale", "from-amber-300 to-yellow-600", "Invested $2 Lakh"],
  ["L", "Ludo", "from-emerald-300 to-green-600", "Invested $1 Lakh"],
  ["C", "Cricket", "from-sky-300 to-blue-600", "Invested $1 Lakh"],
  ["B", "BetZone", "from-rose-300 to-red-600", "Invested $75K"],
  ["F", "Football", "from-lime-300 to-emerald-600", "Invested $60K"],
  ["B", "Basketball", "from-orange-300 to-red-500", "Invested $50K"],
  ["P", "Poker", "from-slate-300 to-slate-600", "Invested $40K"],
  ["T", "Teen Patti", "from-yellow-200 to-amber-500", "Invested $30K"],
  ["H", "Hockey", "from-teal-300 to-cyan-600", "Invested $25K"],
  ["S", "Slots", "from-fuchsia-300 to-purple-600", "Invested $20K"],
];

function PartnerCarousel() {
  const items = [...PARTNERS, ...PARTNERS];
  return (
    <div className="av-card overflow-hidden p-3">
      <p className="text-center text-xs font-black uppercase tracking-widest text-yellow-300">Partner with Aviator Smart AI</p>
      <p className="mt-0.5 text-center text-[11px] text-slate-400">Our capital works across these games & companies — earnings come from here</p>
      <div className="marquee-mask mt-2">
        <div className="marquee-track">
          {items.map(([ch, name, grad, inv], idx) => (
            <div key={idx} className="flex w-32 shrink-0 flex-col items-center gap-1 whitespace-nowrap px-2 py-2">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-black text-white shadow-lg ${grad}`}>{ch}</span>
              <span className="text-xs font-bold">{name}</span>
              <span className="text-[11px] font-bold text-emerald-300">{inv}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const RATE = 0.15;
const COUNTDOWN = 5;
const CRASH_PAUSE = 3;

type Phase = "countdown" | "flying" | "crashed";

export default function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState<FeedItem[]>([randomFeed(), randomFeed(), randomFeed(), randomFeed()]);
  const [history, setHistory] = useState<number[]>([]);

  const R = useRef({ phase: "countdown" as Phase, t: COUNTDOWN, elapsed: 0, crash: genCrash(), points: [] as { x: number; y: number }[] });
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFeed((f) => [randomFeed(), ...f].slice(0, 12)), 3000);
    return () => clearInterval(t);
  }, []);

  // auto-play loop (view only — no bets, no money)
  useEffect(() => {
    const iv = setInterval(() => {
      const s = R.current;
      if (s.phase === "countdown") {
        s.t -= 0.1;
        if (s.t <= 0) { s.phase = "flying"; s.elapsed = 0; s.crash = genCrash(); s.points = []; }
      } else if (s.phase === "flying") {
        s.elapsed += 0.1;
        const crashT = Math.log(s.crash) / RATE;
        if (s.elapsed >= crashT) {
          s.phase = "crashed"; s.t = CRASH_PAUSE;
          setHistory((h) => [s.crash, ...h].slice(0, 12));
        }
      } else {
        s.t -= 0.1;
        if (s.t <= 0) { s.phase = "countdown"; s.t = COUNTDOWN; s.points = []; }
      }
      setTick((x) => x + 1);
    }, 100);
    return () => clearInterval(iv);
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
      ctx.fillText("Next plane taking off…", W / 2, H / 2 + 18);
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
      }
    }
    ctx.textAlign = "left";
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">✈ Aviator <span className="text-xs font-bold text-slate-400">DEMO · display only</span></h2>
        <Link href="/dash" className="text-xs text-slate-300">← Back</Link>
      </div>
      <PartnerCarousel />
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
      <div className="av-card p-4 text-center">
        <p className="text-sm font-bold text-slate-200">View only ✈ — rounds play automatically</p>
        <p className="mt-1 text-xs text-slate-400">Demo game — no money is staked and no earnings are credited. Real earnings come from your bot, daily.</p>
      </div>
      <div className="av-card p-3">
        <h3 className="text-sm font-bold">Live Rounds</h3>
        <div className="mt-2 max-h-64 space-y-1 overflow-hidden text-xs">
          {feed.map((f, i) => (
            <p key={i} className="rounded bg-black/30 px-2 py-1.5"><b>{f.name}</b> bet ${f.bet} → <span className="text-emerald-300">+${f.profit}</span></p>
          ))}
        </div>
      </div>
    </div>
  );
}
