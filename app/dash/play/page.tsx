"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FEED_NAMES } from "@/lib/config";

type FeedItem = { name: string; bet: string; profit: string };

function randomFeed(): FeedItem {
  const name = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)];
  const bet = (2 + Math.random() * 48).toFixed(2);
  const profit = ((Number(bet) * Math.random() * 0.07)).toFixed(2);
  return { name, bet, profit };
}

export default function Play() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feed, setFeed] = useState<FeedItem[]>([randomFeed(), randomFeed(), randomFeed(), randomFeed(), randomFeed()]);
  const [bet, setBet] = useState("10");
  const [used, setUsed] = useState(0);
  const [limit] = useState(10);
  const [msg, setMsg] = useState("");
  const [bets, setBets] = useState<{ round_no?: number; bet_amount?: number; pct?: number }[]>([]);
  const [mult, setMult] = useState("1.00");

  // Live activity feed – new entry every 3 seconds (visual simulation)
  useEffect(() => {
    const t = setInterval(() => setFeed((f) => [randomFeed(), ...f].slice(0, 12)), 3000);
    return () => clearInterval(t);
  }, []);

  // Fake real-time chart animation
  useEffect(() => {
    let raf = 0;
    let start = Date.now();
    const draw = () => {
      const cv = canvasRef.current;
      if (cv) {
        const ctx = cv.getContext("2d");
        if (ctx) {
          const W = (cv.width = cv.offsetWidth * 2);
          const H = (cv.height = 360);
          const el = (Date.now() - start) / 1000;
          if (el > 14) { start = Date.now(); }
          const t = Math.min(el, 14);
          const m = 1 + t * 0.28 + Math.sin(t * 1.7) * 0.12;
          setMult(m.toFixed(2));
          ctx.clearRect(0, 0, W, H);
          // grid
          ctx.strokeStyle = "rgba(148,178,255,.12)";
          ctx.lineWidth = 1;
          for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(0, (H / 6) * i); ctx.lineTo(W, (H / 6) * i); ctx.stroke(); }
          // curve
          ctx.beginPath();
          const pts: [number, number][] = [];
          for (let i = 0; i <= 60; i++) {
            const tt = (t / 14) * i;
            const mm = 1 + tt * 0.28 + Math.sin(tt * 1.7) * 0.12;
            const x = 20 + (i / 60) * (W - 60);
            const y = H - 30 - Math.min((mm - 1) / 5, 1) * (H - 70);
            pts.push([x, y]);
          }
          ctx.strokeStyle = "#ff3b3b";
          ctx.lineWidth = 5;
          ctx.shadowColor = "#ff3b3b";
          ctx.shadowBlur = 18;
          ctx.moveTo(pts[0][0], pts[0][1]);
          pts.forEach(([x, y]) => ctx.lineTo(x, y));
          ctx.stroke();
          ctx.shadowBlur = 0;
          // plane marker
          const [px, py] = pts[pts.length - 1];
          ctx.font = "44px serif";
          ctx.fillText("✈️", px - 20, py - 10);
          // multiplier
          ctx.fillStyle = m > 2 ? "#5eead4" : "#facc15";
          ctx.font = "bold 56px sans-serif";
          ctx.fillText(`${m.toFixed(2)}x`, 30, 70);
          if (el > 14) { ctx.fillStyle = "#fff"; ctx.font = "bold 34px sans-serif"; ctx.fillText("ROUND END", W / 2 - 110, H / 2); }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    fetch("/api/gameplay/history").then((r) => r.json()).then((j) => { if (j.ok) { setBets(j.today); setUsed(j.used); } });
  }, []);

  async function placeBet(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Placing...");
    const r = await fetch("/api/gameplay/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bet: Number(bet) }) });
    const j = await r.json();
    if (!j.ok) { setMsg(j.error); return; }
    setMsg(`Bet $${Number(bet).toFixed(2)} placed · round @${j.multiplier}x (visual – daily profits credit separately)`);
    setUsed((u) => u + 1);
    setBets((b) => [{ round_no: j.round, bet_amount: Number(bet), pct: j.multiplier }, ...b]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black">🔴 Aviator <span className="text-xs font-bold text-emerald-300">LIVE · DEMO FEED</span></h2>
        <Link href="/dash" className="text-xs text-slate-300">← Back</Link>
      </div>
      <div className="av-card overflow-hidden p-2">
        <canvas ref={canvasRef} className="h-[180px] w-full" />
      </div>
      <div className="av-card p-4">
        <form onSubmit={placeBet} className="flex gap-2">
          <input className="av-input" value={bet} onChange={(e) => setBet(e.target.value)} placeholder="Bet USD" />
          <button className="av-btn-red whitespace-nowrap px-5">Place Bet ({limit - used} left)</button>
        </form>
        {msg && <p className="mt-2 text-sm text-yellow-200">{msg}</p>}
        <p className="mt-1 text-xs text-slate-400">Bets are visual. Daily profits credit automatically (3X cap, 365 days).</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">Live Activity</h3>
          <div className="mt-2 max-h-64 space-y-1 overflow-hidden text-xs">
            {feed.map((f, i) => (
              <p key={i} className="rounded bg-black/30 px-2 py-1.5"><b>{f.name}</b> placed ${f.bet} → <span className="text-emerald-300">Profit ${f.profit}</span></p>
            ))}
          </div>
        </div>
        <div className="av-card p-3">
          <h3 className="text-sm font-bold">My bets today ({used}/{limit})</h3>
          <div className="mt-2 space-y-1 text-xs">
            {bets.map((b, i) => (<p key={i} className="rounded bg-black/30 px-2 py-1.5">Round {b.round_no}: ${Number(b.bet_amount).toFixed(2)} @ {b.pct}x</p>))}
            {!bets.length && <p className="text-slate-400">No bets yet today.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
