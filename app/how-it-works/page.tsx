import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { CtaBand, ProFooter, Reveal, SectionHead } from "@/components/marketing";

const STEPS = [
  { n: "01", t: "Register & verify", d: "Sign up with your sponsor ID, verify the 6-digit email OTP and set your BEP20 address. Under 5 minutes.", points: ["Sponsor auto-linked", "OTP-secured account", "Country-tagged profile"] },
  { n: "02", t: "Recharge with BEP20", d: "Send USDT to the gateway address and paste your TX hash. Admin verifies and your Principal wallet is credited.", points: ["Min $10", "QR + address + TX flow", "Verification table"] },
  { n: "03", t: "Activate your bot", d: "Choose Conservative, Balanced or Aggressive. Automated daily profits with 3X cap and 365-day validity.", points: ["Instant activation", "Live cap tracker", "10-level team earnings"] },
  { n: "04", t: "Track & withdraw", d: "Watch wallets, ROI, team and milestones live. Withdraw $2+ during the 7–10 AM IST window.", points: ["Debit / charge / net view", "10% transparent fee", "Reward claims"] },
];

export default function HowItWorks() {
  return (
    <div>
      <SiteHeader />
      <div className="hero-plane">
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-16">
          <Reveal>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-300">How it works</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black md:text-6xl">From signup to payout in <span className="red">four moves.</span></h1>
            <p className="mt-4 max-w-2xl text-slate-300">Register → Recharge → Activate → Track rewards. Every step shows clear wallets, status and support — onboarding feels like a game, not paperwork.</p>
          </Reveal>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-10">
        {STEPS.map((s, idx) => (
          <Reveal key={s.n}>
            <div className={`grid items-center gap-6 py-8 md:grid-cols-2 ${idx % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
              <div>
                <p className="text-6xl font-black text-white/10">{s.n}</p>
                <h2 className="mt-1 text-3xl font-black">{s.t}</h2>
                <p className="mt-2 text-slate-300">{s.d}</p>
                <ul className="mt-4 space-y-2">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm text-slate-200">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-300/20 text-xs font-black text-emerald-300">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="av-card relative overflow-hidden p-8">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-yellow-300 to-emerald-300" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Step {s.n} of 04</p>
                <div className="progress"><div className="progress-fill" style={{ width: `${(idx + 1) * 25}%` }} /></div>
                <div className="mt-6 flex gap-2">
                  <Link href="/register" className="av-btn-yellow px-5 py-2 text-sm">Start here</Link>
                  <Link href="/dash" className="rounded-xl border border-white/20 px-5 py-2 text-sm">Open app</Link>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="border-t border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SectionHead kicker="User journey" title="Onboard · Engage · Earn" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[["Onboard", "Account, KYC-ready profile, sponsor link and first BEP20 recharge."], ["Engage", "Watch the live trading screen, place visual bets, climb campaign boards."], ["Earn", "Daily profits, level commissions, milestone vaults and morning withdrawals."]].map(([t, d], idx) => (
              <Reveal key={t} delay={idx * 0.1}>
                <div className="av-card p-6 text-center">
                  <p className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-300 font-black text-black">{idx + 1}</p>
                  <h3 className="mt-3 text-xl font-black">{t}</h3>
                  <p className="mt-1 text-sm text-slate-300">{d}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10"><CtaBand /></div>
        </div>
      </section>
      <ProFooter />
    </div>
  );
}
