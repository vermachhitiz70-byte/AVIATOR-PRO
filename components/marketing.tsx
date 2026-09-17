"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";

/* ---------------- Scroll reveal wrapper ---------------- */
export function Reveal({ children, delay = 0, y = 28, className = "" }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------- Section heading ---------------- */
export function SectionHead({ kicker, title, sub, align = "center" }: { kicker: string; title: React.ReactNode; sub?: string; align?: "center" | "left" }) {
  return (
    <Reveal className={align === "center" ? "text-center" : "text-left"}>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">{kicker}</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">{title}</h2>
      {sub && <p className={`mt-3 max-w-2xl text-slate-300 ${align === "center" ? "mx-auto" : ""}`}>{sub}</p>}
    </Reveal>
  );
}

/* ---------------- SVG scene art (self-contained, no external images) ---------------- */
function Streaks({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1200 500">
      <defs>
        <linearGradient id={`g-${c1}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={c1} stopOpacity="0" />
          <stop offset="0.6" stopColor={c1} stopOpacity="0.55" />
          <stop offset="1" stopColor={c2} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      {[60, 140, 230, 330, 430].map((y, i) => (
        <g key={y}>
          <rect x="0" y={y} width="1200" height={i % 2 ? 3 : 6} fill={`url(#g-${c1})`} opacity={0.5 - i * 0.06} rx="3" />
          <circle cx={900 + i * 60} cy={y} r={i % 2 ? 60 : 110} fill={c1} opacity="0.07" />
        </g>
      ))}
      <circle cx="1020" cy="110" r="150" fill="none" stroke={c2} strokeOpacity="0.25" strokeWidth="2" />
      <circle cx="1020" cy="110" r="110" fill="none" stroke={c2} strokeOpacity="0.35" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------------- Hero slider ---------------- */
const SLIDES = [
  {
    id: "network",
    eyebrow: "BEP20 · 3X CAP · 20 REWARDS",
    titleA: "GAMING",
    titleB: "NETWORK PLAN",
    accent: "red",
    copy: "Network Marketing Meets Gaming Innovation — activate a bot, grow your team, track everything live.",
    cta1: { label: "Register Free", href: "/register" },
    cta2: { label: "Open Dashboard", href: "/dash" },
  },
  {
    id: "bots",
    eyebrow: "CONSERVATIVE · BALANCED · AGGRESSIVE",
    titleA: "BOT PLANS",
    titleB: "DAILY PROFITS",
    accent: "gold",
    copy: "Three tiers for every budget. Earnings auto-credited daily with 3X capping and 365-day validity.",
    cta1: { label: "View Plans", href: "/plans" },
    cta2: { label: "How It Works", href: "/how-it-works" },
  },
  {
    id: "rewards",
    eyebrow: "10-LEVEL ROI · 5-LEVEL RECHARGE · 20 MILESTONES",
    titleA: "BUILD TEAM.",
    titleB: "EARN BIGGER.",
    accent: "green",
    copy: "Lifetime ROI commissions across 10 levels plus 20 team business reward milestones up to $500,000.",
    cta1: { label: "See Rewards", href: "/rewards" },
    cta2: { label: "About Us", href: "/about" },
  },
];

export function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((n: number) => setI((n + SLIDES.length) % SLIDES.length), []);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  const s = SLIDES[i];
  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (dx > 40) go(i - 1);
        if (dx < -40) go(i + 1);
        touchX.current = null;
      }}
    >
      <div className="hero-plane absolute inset-0" />
      <Streaks c1={s.accent === "red" ? "#ff3b3b" : s.accent === "gold" ? "#facc15" : "#5eead4"} c2="#ff3b3b" />

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 md:pb-24 md:pt-20">
        <div className="min-h-[300px] max-w-3xl md:min-h-[340px]">
          <AnimatePresence mode="wait">
            <motion.div key={s.id} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
              <p className="live-pill">{s.eyebrow}</p>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] md:text-7xl">
                {s.titleA} <br />
                <span className={s.accent === "red" ? "red" : s.accent === "gold" ? "text-yellow-300" : "mint"}>{s.titleB}</span>
              </h1>
              <p className="mt-4 max-w-xl text-slate-300">{s.copy}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={s.cta1.href} className="av-btn-red px-7 py-3">{s.cta1.label}</Link>
                <Link href={s.cta2.href} className="rounded-xl border border-white/25 px-7 py-3 font-bold hover:border-yellow-300">{s.cta2.label}</Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <button onClick={() => go(i - 1)} aria-label="Previous" className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xl md:block">‹</button>
      <button onClick={() => go(i + 1)} aria-label="Next" className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xl md:block">›</button>
      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {SLIDES.map((sl, n) => (
          <button key={sl.id} onClick={() => go(n)} aria-label={`Slide ${n + 1}`} className={`h-2 rounded-full transition-all ${n === i ? "w-8 bg-yellow-300" : "w-2 bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Animated counter ---------------- */
export function Stat({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t0 = Date.now();
    const t = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 1400);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p >= 1) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [inView, value]);
  return (
    <div ref={ref} className="av-card p-5 text-center">
      <p className="text-3xl font-black text-yellow-300 md:text-4xl">{n.toLocaleString()}{suffix}</p>
      <p className="mt-1 text-sm text-slate-300">{label}</p>
    </div>
  );
}

/* ---------------- Google-style reviews ---------------- */
function GLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.4 7.4 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.5-2.7-.1.1C.6 8.6 0 10.2 0 12s.6 3.4 1.6 4.9l3.6-2.5z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.4 0 3.5 2.6 1.6 6.9l3.6 2.8c1-2.9 3.7-5 6.8-5z" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5">
      {[0, 1, 2, 3, 4].map((s) => (
        <svg key={s} viewBox="0 0 20 20" className="h-4 w-4 fill-yellow-400">
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </div>
  );
}

const REVIEWS = [
  { name: "Rahul Sharma", meta: "Mumbai · 2 weeks ago", text: "Recharge took 10 minutes to reflect after admin approval. Daily profits land every morning like clockwork. Dashboard is super clear.", tag: "Verified member" },
  { name: "Priya Nair", meta: "Kochi · 1 month ago", text: "I compared the numbers with my upline daily — 10-level ROI commission matches the plan PDF exactly. Withdrawal charge shown upfront, no surprises.", tag: "Team leader" },
  { name: "Amit Verma", meta: "Delhi · 3 weeks ago", text: "Bot activation was instant from my principal wallet. The 3X cap logic is transparent — you can see total earned vs cap right on the bot card.", tag: "Verified member" },
  { name: "Sneha Reddy", meta: "Hyderabad · 2 months ago", text: "Built a team of 40 using just the referral QR. Level-wise tree makes it easy to show new members where commissions come from.", tag: "Team leader" },
  { name: "Vikram Patel", meta: "Ahmedabad · 1 month ago", text: "Withdrew twice during the morning window. Net amount after 10% charge matched to the paisa. Support tickets get answered same day.", tag: "Verified member" },
  { name: "Ethan Brooks", meta: "Texas, US · 3 weeks ago", text: "Joined for the Vietnam Ticket campaign. KPI cards and leaderboard update daily — finally an MLM dashboard that doesn't hide the math.", tag: "Campaign achiever" },
];

export function GoogleReviews() {
  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <GLogo />
        <p className="text-lg font-bold">4.8 · 2,300+ Google reviews</p>
        <Stars />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r, idx) => (
          <Reveal key={r.name} delay={(idx % 3) * 0.1}>
            <div className="av-card flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <Stars />
                <GLogo />
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-200">&ldquo;{r.text}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-yellow-500 font-black">{r.name[0]}</div>
                <div>
                  <p className="text-sm font-bold">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.meta} · {r.tag}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

/* ---------------- CTA band ---------------- */
export function CtaBand() {
  return (
    <Reveal>
      <div className="hero-plane relative overflow-hidden rounded-3xl border border-red-500/30 px-6 py-12 text-center">
        <Streaks c1="#ff3b3b" c2="#facc15" />
        <div className="relative">
          <h2 className="text-3xl font-black md:text-5xl">Ready for takeoff?</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">Activate your bot · Build your team · Track every dollar live.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="av-btn-red px-8 py-3">Join Aviator Smart AI</Link>
            <Link href="/plans" className="rounded-xl border border-white/25 px-8 py-3 font-bold">Compare Plans</Link>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ---------------- Professional footer ---------------- */
export function ProFooter() {
  const cols: { h: string; links: { label: string; href: string }[] }[] = [
    { h: "Platform", links: [{ label: "About Us", href: "/about" }, { label: "How It Works", href: "/how-it-works" }, { label: "Bot Plans", href: "/plans" }, { label: "Rewards", href: "/rewards" }] },
    { h: "Members", links: [{ label: "Register", href: "/register" }, { label: "Login", href: "/login" }, { label: "Forgot Password", href: "/forgot" }] },
    { h: "Support", links: [{ label: "Terms & Conditions", href: "/terms" }, { label: "Withdraw Window", href: "/terms" }, { label: "Help / AI Support", href: "/dash/support" }, { label: "Admin", href: "/admin" }] },
  ];
  return (
    <footer className="border-t border-white/10 bg-[#04070f]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <p className="text-xl font-black text-yellow-400">AVIATOR SMART AI</p>
          <p className="mt-2 max-w-xs text-sm text-slate-400">Network Marketing Meets Gaming Innovation. BEP20 rails, 2X–5X tier bots, 20 team rewards.</p>
          <div className="mt-4 flex gap-2">
            {["X", "f", "in", "ig"].map((s) => (
              <span key={s} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-xs font-black text-slate-300">{s}</span>
            ))}
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <p className="text-sm font-black uppercase tracking-widest text-slate-200">{c.h}</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {c.links.map((l) => (
                <li key={l.label}><Link href={l.href} className="hover:text-yellow-300">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-slate-500">
          <p>www.aviatorsmartai.com · High-return programs carry high risk. Figures shown are plan targets, not guaranteed returns.</p>
          <p className="mt-1">© 2026 Aviator Smart AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
