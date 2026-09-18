"use client";
import { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site";
import { BOT_PLANS } from "@/lib/config";
import { CtaBand, PageHero, ProFooter, Reveal, SectionHead } from "@/components/marketing";

export default function Plans() {
  const [amount, setAmount] = useState(1000);
  const plan = BOT_PLANS.find((p) => amount >= p.min && amount <= p.max);
  const daily = plan ? (amount * plan.dailyPct) / 100 : 0;
  const cap = plan ? amount * plan.multiplier : 0;

  return (
    <div>
      <SiteHeader />
      <PageHero kicker="Bot plans" titleA="Six tiers." titleB="Daily profits, on autopilot." accent="gold" sub="Your tier sets your bracket — predictable automated earnings every day, with 2X–5X capping and 365-day validity on all plans." />

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          {BOT_PLANS.map((p, idx) => (
            <Reveal key={p.id} delay={idx * 0.1}>
              <div className={`glass-red relative flex h-full flex-col p-8 ${idx < 2 ? "tier-glow-green" : idx < 4 ? "tier-glow-gold" : "tier-glow-red"}`}>
                {idx === 1 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-yellow-300 px-4 py-1 text-xs font-black text-black">MOST POPULAR</span>}
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">{p.id}</p>
                <h2 className="mt-1 text-2xl font-black">{p.name}</h2>
                <p className="mt-4"><span className="text-4xl font-black text-yellow-300">${p.min.toLocaleString()}</span><span className="text-slate-400"> — ${p.max.toLocaleString()} USDT</span></p>
                <div className="mt-5 space-y-2.5 text-sm">
                  {[["Daily profits", `${p.dailyPct}% auto-credited`], ["Profit capping", `${p.multiplier}X auto-stop`], ["Validity", "365 days"], ["Level commissions", "10 levels"], ["Milestones", "All 20 vaults"]].map(([a, b]) => (
                    <div key={a} className="flex justify-between border-b border-white/10 pb-2"><span className="text-slate-300">{a}</span><b>{b}</b></div>
                  ))}
                </div>
                <Link href="/register" className={`${idx === 1 ? "av-btn-yellow" : "av-btn-red"} mt-6 block py-3 text-center text-sm`}>Activate {p.name.split(" ")[0]}</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* interactive estimator */}
      <section className="border-y border-white/10 bg-[#080e1c]">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <SectionHead kicker="Estimator" title="What could $X earn?" sub="Drag the slider. Math only — plan targets, not guarantees." />
          <Reveal>
            <div className="av-card mt-6 p-8">
              <div className="flex items-end justify-between">
                <div><p className="text-sm text-slate-400">Investment</p><p className="text-4xl font-black text-yellow-300">${amount.toLocaleString()}</p></div>
                <div className="text-right"><p className="text-sm text-slate-400">Tier</p><p className="font-black">{plan ? plan.name : "— above max —"}</p></div>
              </div>
              <input type="range" min={10} max={100000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-6 w-full accent-yellow-300" />
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl bg-black/40 p-4"><p className="text-xs text-slate-400">Daily profit</p><p className="text-xl font-black text-emerald-300">${daily.toFixed(2)}</p></div>
                <div className="rounded-2xl bg-black/40 p-4"><p className="text-xs text-slate-400">30 days ≈</p><p className="text-xl font-black">${(daily * 30).toFixed(0)}</p></div>
                <div className="rounded-2xl bg-black/40 p-4"><p className="text-xs text-slate-400">{plan ? `${plan.multiplier}X cap at` : "Cap at"}</p><p className="text-xl font-black">${cap.toLocaleString()}</p></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* conditions */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <SectionHead kicker="Bot conditions" title="The fine print, made clear" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["2X–5X Capping", "Once direct earnings reach your tier cap (2X–5X of bot amount), it stops automatically. Direct + level commissions never cap."],
            ["365-day validity", "Bots run free for up to a year. Whichever comes first — cap or expiry — closes the bot."],
            ["Daily crediting", "Tier-rate profits land in your ROI wallet every day via automated job, plus 10-level team commissions."],
            ["BEP20 rails", "Recharge in USDT-BEP20. Gateway address, QR flow and TX-hash verification included."],
          ].map(([t, d], idx) => (
            <Reveal key={t} delay={(idx % 2) * 0.1}>
              <div className="av-card flex gap-4 p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-300 font-black text-black">{idx + 1}</span>
                <div><h3 className="font-black">{t}</h3><p className="mt-1 text-sm text-slate-300">{d}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10"><CtaBand /></div>
      </section>
      <ProFooter />
    </div>
  );
}
