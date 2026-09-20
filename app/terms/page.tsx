import { SiteHeader } from "@/components/site";
import { BUSINESS_RULES } from "@/lib/config";
import { CtaBand, PageHero, ProFooter, Reveal } from "@/components/marketing";

const RULES = [
  ["Eligibility", "Members must be 18+. One account per person — multi-account farming leads to suspension and commission clawback."],
  ["Deposits", `Minimum $${BUSINESS_RULES.minInvestment} via USDT-BEP20. Funds credit to Principal only after admin verification of your TX hash.`],
  ["Daily income", `Automated daily share of your active bot amount (3%–10% by tier), auto-credited daily. Bots stop at 2X–5X direct earnings or ${BUSINESS_RULES.botValidityDays} days. Direct + level commissions never cap.`],
  ["Commissions", "First-recharge bonuses pay once per member (5/2/1/1/1). ROI team commissions (5/2/2/2/2/1…) pay on downline daily earnings."],
  ["Withdrawals", `Minimum $${BUSINESS_RULES.minWithdrawal}, maximum $${BUSINESS_RULES.maxWithdrawal.toLocaleString()} with a ${BUSINESS_RULES.withdrawalChargePct}% deduction, processed during ${BUSINESS_RULES.withdrawalWindowIST} IST. Rejected requests are refunded to Principal.`],
  ["Milestones & campaigns", "Reward vaults credit on claim after thresholds; campaign tickets follow published criteria and eligibility dates."],
  ["Fair play", "Bots, scripts or TX-hash reuse to game the system will be blocked. Balances and referrals are audited."],
  ["Risk disclosure", "All figures are plan targets, not guaranteed returns. Aviator Smart AI programs carry high risk — never deposit more than you can afford to lose."],
];

export default function Terms() {
  return (
    <div>
      <SiteHeader />
      <PageHero kicker="Legal" titleA="Terms, in" titleB="plain English." accent="red" sub="Please review the platform rules before investing or withdrawing. Last updated September 2026." />

      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2">
          {RULES.map(([t, d], idx) => (
            <Reveal key={t} delay={(idx % 2) * 0.08}>
              <div className="av-card h-full p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/20 font-black text-red-400">{idx + 1}</span>
                  <h2 className="font-black">{t}</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Min withdrawal", `$${BUSINESS_RULES.minWithdrawal}`], ["Max withdrawal", `$${BUSINESS_RULES.maxWithdrawal.toLocaleString()}`], ["Withdrawal fee", `${BUSINESS_RULES.withdrawalChargePct}%`], ["Min investment", `$${BUSINESS_RULES.minInvestment}`], ["Withdraw window", "7–10 AM IST"]].map(([a, b]) => (
              <div key={a} className="av-card p-4 text-center">
                <p className="text-xs text-slate-400">{a}</p>
                <p className="mt-1 text-xl font-black text-yellow-300">{b}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <div className="mt-10"><CtaBand /></div>
      </section>
      <ProFooter />
    </div>
  );
}
