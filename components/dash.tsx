"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashTop() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0b1426] px-4 py-3">
      <span className="text-lg font-black text-yellow-400">AVIATOR PRO</span>
      <button className="rounded-lg border border-white/15 px-3 py-1 text-slate-300" aria-label="menu">☰</button>
    </div>
  );
}

const NAV = [
  { href: "/dash", label: "Home", icon: "⌂" },
  { href: "/dash/play", label: "Trade", icon: "📈" },
  { href: "/dash/support", label: "AI Help", icon: "✦" },
  { href: "/dash/withdraw", label: "Withdraw", icon: "$" },
  { href: "/dash/profile", label: "Profile", icon: "◉" },
];

export function DashBottom() {
  const path = usePathname();
  return (
    <div className="bottom-nav">
      <div className="relative mx-auto grid max-w-md grid-cols-5 px-2 py-2 text-center text-xs">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "text-sky-300 font-bold" : "text-slate-300"}>
            <div className="text-lg leading-none">{n.icon}</div>
            <div className="mt-1">{n.label}</div>
          </Link>
        ))}
        <Link href="/dash/support" className="absolute -top-7 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-yellow-300 text-lg font-black text-black shadow-lg" aria-label="AI">🤖</Link>
      </div>
    </div>
  );
}

export function LiveToasts({ items }: { items: { kind: string; message: string; time: string }[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((t, i) => (
        <div key={i} className="av-card px-3 py-2 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.kind}</p>
          <p className="font-semibold">{t.message}</p>
          <p className="text-xs text-yellow-400/80">{t.time}</p>
        </div>
      ))}
    </div>
  );
}
