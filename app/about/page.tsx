import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { CtaBand, GoogleReviews, PayoutTicker, ProFooter, Reveal, SectionHead, Stat } from "@/components/marketing";

const VALUES = [
  ["Innovation", "Fresh mechanics, seasonal campaigns and a roadmap driven by member feedback.", "01"],
  ["Reliability", "BEP20 rails, automated daily payouts and 99.9% uptime targets.", "02"],
  ["Transparency", "Every recharge, ROI credit and commission written to your ledger.", "03"],
  ["Performance", "Sub-second dashboard loads and instant balance updates.", "04"],
  ["User Experience", "Mobile-first design that feels like a game, not a bank.", "05"],
];

const JOURNEY = [
  ["2024 — Takeoff", "Aviator Smart AI launches with six bot tiers and a 500-member founding squad."],
  ["2025 — Climb", "10-level ROI engine ships with full ledger transparency."],
  ["2026 — Cruise", "Vietnam Ticket campaign, AI help desk and 20 milestone vaults. 25,000-member target."],
];

export default function About() {
  return (
    <div>
      <SiteHeader />
      {/* hero */}
      <div className="cine-bg relative overflow-hidden">
        <div className="ring-art pointer-events-none absolute -right-32 top-0 hidden h-[28rem] w-[28rem] opacity-70 md:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">About us</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight md:text-6xl">Gaming soul.<br /><span className="gold-text">Network engine.</span></h1>
            <p className="mt-4 max-w-2xl text-slate-300">AVIATOR SMART AI is a modern gaming platform delivering an engaging, exciting and smooth Aviator experience — innovative features, a user-friendly interface and an enjoyable digital environment, all on one platform.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/register" className="av-btn-red btn-shine px-7 py-3 text-sm">Join the Network</Link>
              <Link href="/plans" className="rounded-xl border border-white/25 px-7 py-3 text-sm font-bold">See Bot Plans</Link>
            </div>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat value={25000} suffix="+" label="Members targeted" />
            <Stat value={2000000} suffix="" label="$ recharge volume goal" />
            <Stat value={8000} suffix="" label="Bots to activate" />
            <Stat value={35} suffix="%" label="DAU/MAU retention target" />
          </div>
        </div>
      </div>
      <PayoutTicker />

      {/* mission / vision */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="relative h-full overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/15 to-transparent p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">Our mission</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">Modern, reliable, entertaining.</h2>
              <p className="mt-3 text-slate-300">To create a gaming platform where technology, simplicity and user experience come together — and where every member can earn transparently from day one.</p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="relative h-full overflow-hidden rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-300/10 to-transparent p-8">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">Our vision</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">The trusted name in digital gaming.</h2>
              <p className="mt-3 text-slate-300">To be known for quality technology, smooth performance and an exceptional user experience — across every country we operate in.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* values */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Core values" title={<>What guides <span className="mint">every release</span></>} />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {VALUES.map(([t, d, n], idx) => (
              <Reveal key={t} delay={(idx % 3) * 0.1}>
                <div className="av-card group h-full p-6 transition-transform hover:-translate-y-1">
                  <p className="text-4xl font-black text-white/10 transition-colors group-hover:text-yellow-300/30">{n}</p>
                  <h3 className="mt-1 text-xl font-black">{t}</h3>
                  <p className="mt-2 text-sm text-slate-300">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* journey timeline */}
      <section className="mx-auto max-w-4xl px-4 py-14">
        <SectionHead kicker="Journey" title={<>The flight <span className="red">so far</span></>} />
        <div className="mt-8 space-y-0">
          {JOURNEY.map(([t, d], idx) => (
            <Reveal key={t} delay={idx * 0.08}>
              <div className="relative flex gap-5 pb-8 last:pb-0">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-yellow-300/50 bg-black/50 font-black text-yellow-300">{idx + 1}</div>
                  {idx < JOURNEY.length - 1 && <div className="w-px flex-1 bg-gradient-to-b from-yellow-300/50 to-transparent" />}
                </div>
                <div className="av-card flex-1 p-5">
                  <h3 className="font-black">{t}</h3>
                  <p className="mt-1 text-sm text-slate-300">{d}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* reviews */}
      <section className="border-t border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <SectionHead kicker="Reviews" title={<>Members rate us <span className="red">4.8 / 5</span></>} />
          <div className="mt-6"><GoogleReviews /></div>
          <div className="mt-10"><CtaBand /></div>
        </div>
      </section>

      <ProFooter />
    </div>
  );
}
