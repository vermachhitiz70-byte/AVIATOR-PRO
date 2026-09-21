import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { BOT_PLANS, MILESTONES } from "@/lib/config";
import { CtaBand, GoogleReviews, HeroSlider, PageHero, PayoutTicker, ProFooter, Reveal, SectionHead, Stat } from "@/components/marketing";

const STEPS = [
  { n: "01", t: "Register", d: "Create your account in minutes, verify email OTP, add your sponsor ID.", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8" },
  { n: "02", t: "Recharge", d: "Top up with BEP20 USDT via QR or payment address. Min $10, approved fast.", icon: "M21 12V7H5a2 2 0 0 1 0-4h14v4 M3 5v14a2 2 0 0 0 2 2h16v-5 M18 12a2 2 0 0 0 0 4h-4v-4Z" },
  { n: "03", t: "Activate Bot", d: "Pick any of 6 tiers (3%–10% daily). Automated profits, auto-credited at 5 AM.", icon: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M9 12l2 2 4-4" },
  { n: "04", t: "Track & Withdraw", d: "Watch wallets, team and milestones live. Withdraw $2+ between 8–10 AM.", icon: "M3 17l6-6 4 4 8-8 M15 7h6v6" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#facc15" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const WHY = [
  ["Immersive gameplay", "High-engagement experience with exciting reward loops."],
  ["Fast & smooth", "Optimized for speed, quick access and seamless performance."],
  ["Mobile-first", "Play anywhere with a fully responsive platform."],
  ["Secure & reliable", "BEP20 rails, OTP security and transparent ledgers."],
  ["Modern interface", "Intuitive design for smooth navigation and easy play."],
  ["Global access", "A worldwide platform built for gamers everywhere."],
];

const FIRST5: [string, string][] = [["Level 1", "5%"], ["Level 2", "2%"], ["Level 3", "1%"], ["Level 4", "1%"], ["Level 5", "1%"]];
  const ROI10: [string, string][] = [["Level 1", "5%"], ["Level 2", "2%"], ["Level 3–5", "2% each"], ["Levels 6–10", "1% each"]];

export default function Home() {
  return (
    <div>
      <SiteHeader />
      <HeroSlider />
      <PayoutTicker />

      {/* trust stats */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-10 md:grid-cols-4">
        <Stat value={5} suffix="X" label="Max profit capping per tier" />
        <Stat value={20} suffix="" label="Team reward milestones" />
        <Stat value={10} suffix="" label="Levels of ROI commission" />
        <Stat value={365} suffix="" label="Days of bot validity" />
      </div>

      {/* about preview */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">About Aviator Smart AI</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">A modern gaming platform, <span className="red">rebuilt for earners.</span></h2>
            <p className="mt-4 text-slate-300">Engaging gameplay, a user-friendly interface and an enjoyable digital environment — fused with network marketing mechanics: bot plans, level commissions and 20 milestone rewards.</p>
            <div className="mt-5 flex gap-3">
              <Link href="/about" className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(255,45,45,.45)] hover:bg-red-500">Our Story</Link>
              <Link href="/how-it-works" className="rounded-xl border border-white/25 px-6 py-2.5 text-sm font-bold">How It Works</Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="grid grid-cols-2 gap-3">
              {[["Innovation", "Fresh mechanics every season"], ["Reliability", "99.9% uptime target"], ["Transparency", "Every credit on-ledger"], ["Performance", "Sub-second dashboard"]].map(([t, d]) => (
                <div key={t} className="glass-red p-5">
                  <p className="font-black text-yellow-300">{t}</p>
                  <p className="mt-1 text-sm text-slate-300">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* how it works */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Getting started" title={<>Live in <span className="red">four steps</span></>} sub="Onboarding feels simple, fast and game-like. Every step shows clear wallets, status and support." />
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, idx) => (
              <Reveal key={s.n} delay={idx * 0.1}>
                <div className="glass-red group relative h-full overflow-hidden p-6">
                  <div className="absolute -right-2 -top-4 text-7xl font-black text-white/5">{s.n}</div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-300/30 bg-black/40"><Icon d={s.icon} /></div>
                  <p className="mt-4 text-xs font-black tracking-widest text-red-400">STEP {s.n}</p>
                  <h3 className="mt-1 text-xl font-black">{s.t}</h3>
                  <p className="mt-2 text-sm text-slate-300">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* plans preview */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead kicker="Bot plans" title={<>Pick your <span className="mint">altitude</span></>} sub={`Automated daily income · 2X–5X capping per tier · 365-day validity on every tier.`} />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {BOT_PLANS.map((p, idx) => (
            <Reveal key={p.id} delay={idx * 0.1}>
              <div className={`glass-red relative h-full p-7 ${idx < 2 ? "tier-glow-green" : idx < 4 ? "tier-glow-gold" : "tier-glow-red"}`}>
                {idx === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-300 px-4 py-1 text-xs font-black text-black">MOST POPULAR</span>}
                <h3 className="text-xl font-black">{p.name}</h3>
                <p className="mt-3 text-3xl font-black text-yellow-300">${p.min.toLocaleString()}<span className="text-base text-slate-400"> – ${p.max.toLocaleString()}</span></p>
                <ul className="mt-4 space-y-2 text-sm text-slate-300">
                  <li>✓ {p.dailyPct}% automated daily profits</li>
                  <li>✓ {p.multiplier}X profit capping</li>
                  <li>✓ 365-day validity</li>
                  <li>✓ 10-level team commissions</li>
                </ul>
                <Link href="/register" className="av-btn-yellow btn-shine mt-6 block py-2.5 text-center text-sm">Activate {p.name.split(" ")[0]}</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* income tracks */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Two income tracks" title={<>Direct + team, <span className="red">for life</span></>} />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Reveal>
              <div className="glass-red h-full p-7">
                <p className="text-xs font-black uppercase tracking-widest text-yellow-300">One-time · First recharge</p>
                <h3 className="mt-1 text-2xl font-black">5-Level Direct Income</h3>
                <div className="mt-4 space-y-2">
                  {FIRST5.map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm">
                      <span className="font-bold">{l}</span><b className="text-lg text-yellow-300">{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="glass-red h-full p-7">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Lifetime · Daily ROI cut</p>
                <h3 className="mt-1 text-2xl font-black">10-Level ROI Income</h3>
                <div className="mt-4 space-y-2">
                  {ROI10.map(([l, v]) => (
                    <div key={l} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm">
                      <span className="font-bold">{l}</span><b className="text-lg text-emerald-300">{v}</b>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* game spotlight */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Aviator crash game</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">10 rounds a day. <span className="red">Live Aviator rounds.</span></h2>
            <p className="mt-4 text-slate-300">Watch the plane fly in real time, cash out before it crashes. Demo game — see live rounds beside you.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>✓ Min $0.10 stake · instant settlement</li>
              <li>✓ Live trader feed every 3 seconds</li>
               <li>✓ Rest auto-credits at 5 AM</li>
            </ul>
            <div className="mt-5 flex gap-3">
              <Link href="/register" className="av-btn-red btn-shine px-6 py-2.5 text-sm">Start Trading</Link>
              <Link href="/plans" className="rounded-xl border border-white/25 px-6 py-2.5 text-sm font-bold">Compare Plans</Link>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="glass-red overflow-hidden p-2">
              <img src="https://maticz.com/assets/images/aviatorgame/aviator-game-development-company.webp" alt="Aviator crash game" className="h-auto w-full rounded-xl object-cover" loading="lazy" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* why choose us */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Why Aviator Smart AI" title={<>Built for <span className="red">players & builders</span></>} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {WHY.map(([t, d], idx) => (
              <Reveal key={t} delay={(idx % 3) * 0.1}>
                <div className="glass-red h-full p-6">
                  <div className="h-1 w-12 rounded-full bg-gradient-to-r from-red-500 to-yellow-300" />
                  <h3 className="mt-3 font-black">{t}</h3>
                  <p className="mt-1 text-sm text-slate-300">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* rewards preview */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHead kicker="Milestones" title={<>20 ways to <span className="mint">win bigger</span></>} sub="From Bronze Flight ($100) to Crown Aviator ($500,000). Grow self + direct + team business to unlock each vault." />
        <div className="mt-8 grid gap-3 md:grid-cols-4">
          {MILESTONES.filter((m) => [1, 5, 10, 20].includes(m.tier)).map((m, idx) => (
            <Reveal key={m.tier} delay={idx * 0.1}>
              <div className="glass-red p-6 text-center">
                <p className="text-xs font-black tracking-widest text-slate-400">TIER {String(m.tier).padStart(2, "0")}</p>
                <h3 className="mt-1 font-black">{m.name}</h3>
                <p className="mt-3 text-3xl font-black text-emerald-300">${m.wallet.toLocaleString()}</p>
                <p className="mt-1 text-xs text-slate-400">Self ${m.self.toLocaleString()} · Direct ${m.direct.toLocaleString()} · Team ${m.team.toLocaleString()}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="text-center">
          <Link href="/rewards" className="mt-6 inline-block rounded-xl border border-white/25 px-8 py-3 font-bold hover:border-yellow-300">View all 20 milestones</Link>
        </Reveal>
      </section>

      {/* reviews */}
      <section className="border-t border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Member reviews" title={<>Loved by <span className="red">thousands</span></>} />
          <div className="mt-6"><GoogleReviews /></div>
        </div>
      </section>

      {/* faq */}
      <section className="mx-auto max-w-3xl px-4 py-14">
        <SectionHead kicker="FAQ" title="Quick answers" />
        <div className="mt-6 space-y-3">
          {[
            ["What is the minimum to start?", "Just $10 USDT (BEP20). Pick any bot tier from $10 to $100,000 and activate instantly from your principal wallet."],
            ["How do daily profits work?", "Every active bot earns automated profits daily, auto-credited at 5 AM — plus 10-level team ROI commissions."],
            ["What is tier capping?", "A bot stops automatically once direct earnings reach its tier cap (2X–5X of bot amount). Direct + team commissions never cap. Validity is 365 days, whichever comes first."],
            ["When can I withdraw?", "Daily between 8:00–10:00 AM. Minimum $2 with a 10% charge shown upfront as debit / charge / net."],
            ["How do team commissions work?", "Earn 5/2/1/1/1% on first recharges across 5 levels, and 5/2/2/2/2/1% across 10 levels on daily ROI — for life."],
          ].map(([q, a]) => (
            <Reveal key={q}>
              <details className="glass-red group p-5">
                <summary className="cursor-pointer font-bold">{q}</summary>
                <p className="mt-2 text-sm text-slate-300">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <div className="mt-10"><CtaBand /></div>
      </section>

      <ProFooter />
    </div>
  );
}
