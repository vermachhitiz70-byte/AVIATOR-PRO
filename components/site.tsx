import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060b16]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-black tracking-wide text-yellow-400">AVIATOR PRO</Link>
        <nav className="hidden gap-5 text-sm text-slate-300 md:flex">
          <Link href="/about">About</Link>
          <Link href="/how-it-works">How It Works</Link>
          <Link href="/plans">Plans</Link>
          <Link href="/rewards">Rewards</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <div className="flex gap-2">
          <Link href="/login" className="rounded-lg border border-white/20 px-3 py-2 text-sm">Login</Link>
          <Link href="/register" className="av-btn-yellow px-4 py-2 text-sm">Register</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-400">
      <div className="mx-auto max-w-6xl px-4">
        <p className="font-bold text-slate-200">www.aviatorpro.co.uk</p>
        <p className="mt-2">Network Marketing Meets Gaming Innovation · BEP20 · 3X/6X Cap · 20 Rewards</p>
        <p className="mt-2 text-xs">Demo rebuild for client review. High-return claims are high-risk; add your legal/risk disclaimer before production.</p>
      </div>
    </footer>
  );
}

export function Section({ id, kicker, title, children }: { id?: string; kicker?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-10">
      {kicker && <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">{kicker}</p>}
      <h2 className="section-title mt-1">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
