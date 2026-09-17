import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { FIRST_RECHARGE_LEVELS, MILESTONES, ROI_LEVELS } from "@/lib/config";
import { CtaBand, PayoutTicker, ProFooter, Reveal, SectionHead } from "@/components/marketing";

const SHOWCASE = [1, 5, 10, 15, 20];

export default function Rewards() {
  return (
    <div>
      <SiteHeader />
      <div className="cine-bg relative overflow-hidden">
        <div className="ring-art pointer-events-none absolute -right-32 top-0 hidden h-[26rem] w-[26rem] opacity-70 md:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-16">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Rewards</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">20 vaults.<br /><span className="gold-text">Up to $500,000.</span></h1>
            <p className="mt-4 max-w-2xl text-slate-300">Grow self + direct + team business to crack each vault. Rewards land straight in your withdrawable Reward wallet — plus lifetime commissions on two tracks.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="av-btn-red btn-shine px-7 py-3 text-sm">Claim Your Future</Link>
              <Link href="/dash/business-plan" className="rounded-xl border border-white/25 px-7 py-3 text-sm font-bold">Track Progress</Link>
            </div>
          </Reveal>
        </div>
      </div>
      <PayoutTicker />

      {/* commission tracks */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="av-card h-full p-7">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-300">Track 1 · One-time</p>
              <h2 className="mt-1 text-2xl font-black">5-Level First Recharge</h2>
              <p className="mt-1 text-sm text-slate-400">Paid once, on each member&apos;s first recharge.</p>
              <div className="mt-4 space-y-2">
                {FIRST_RECHARGE_LEVELS.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm"><span>Level {i + 1}</span><b className="text-yellow-300">{p}%</b></div>
                    <div className="progress"><div className="progress-fill" style={{ width: `${(p / 5) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="av-card h-full p-7">
              <p className="text-xs font-black uppercase tracking-widest text-emerald-300">Track 2 · Lifetime</p>
              <h2 className="mt-1 text-2xl font-black">10-Level ROI Income</h2>
              <p className="mt-1 text-sm text-slate-400">A cut of your team&apos;s daily profits, every day, 10 levels deep.</p>
              <div className="mt-4 space-y-2">
                {ROI_LEVELS.map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm"><span>Level {i + 1}</span><b className="text-emerald-300">{p}%</b></div>
                    <div className="progress"><div className="progress-fill" style={{ width: `${(p / 6) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* milestone showcase */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SectionHead kicker="Hall of vaults" title="Signature milestones" />
          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {MILESTONES.filter((m) => SHOWCASE.includes(m.tier)).map((m, idx) => (
              <Reveal key={m.tier} delay={idx * 0.08}>
                <div className="av-card relative overflow-hidden p-6 text-center">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-yellow-300 to-emerald-300" />
                  <p className="text-xs font-black tracking-widest text-slate-400">{String(m.tier).padStart(2, "0")}</p>
                  <h3 className="mt-1 text-sm font-black">{m.name}</h3>
                  <p className="mt-3 text-3xl font-black text-emerald-300">${m.wallet >= 1000 ? `${m.wallet / 1000}k` : m.wallet}</p>
                  <p className="mt-1 text-xs text-slate-400">Self ${m.self.toLocaleString()} · Direct ${m.direct.toLocaleString()}<br />Team ${m.team.toLocaleString()}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* full ladder */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        <SectionHead kicker="Full ladder" title="All 20 tiers" sub="Track progress live in your dashboard — locked, eligible or claimed." />
        <Reveal>
          <div className="mt-6 space-y-2">
            {MILESTONES.map((m) => (
              <div key={m.tier} className="av-card flex items-center gap-4 px-5 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/50 font-black text-yellow-300">{String(m.tier).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{m.name}</p>
                  <p className="text-xs text-slate-400">Self ${m.self.toLocaleString()} · Direct ${m.direct.toLocaleString()} · Team ${m.team.toLocaleString()}</p>
                </div>
                <p className="font-black text-emerald-300">${m.wallet.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal className="text-center">
          <Link href="/dash/business-plan" className="av-btn-yellow mt-8 inline-block px-8 py-3 text-sm">Track my progress</Link>
        </Reveal>
        <div className="mt-10"><CtaBand /></div>
      </section>
      <ProFooter />
    </div>
  );
}
