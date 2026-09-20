"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FEED_NAMES } from "@/lib/config";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  Bot,
  ChevronLeft,
  History,
  Home,
  LifeBuoy,
  LogOut,
  Megaphone,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";

const MENU_LINKS = [
  { href: "/dash", label: "Home" },
  { href: "/dash/profile", label: "Profile" },
  { href: "/dash/support", label: "Support" },
  { href: "/api/auth/logout", label: "Logout" },
];

export function DashTop() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0b1426]">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dash" className="text-lg font-black text-yellow-400">AVIATOR SMART AI</Link>
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg border border-white/15 p-2 text-slate-300"
          aria-label="menu"
        >
          {open ? <X className="h-5 w-5" /> : <span className="block h-5 w-5 text-center leading-5">☰</span>}
        </button>
      </div>
      {open && (
        <nav className="border-t border-white/10 px-2 py-2">
          {MENU_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
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

const SIDE_NAV = [
  { href: "/dash", label: "Home", icon: Home },
  { href: "/dash/play", label: "Trade", icon: TrendingUp },
  { href: "/dash/recharge", label: "Recharge", icon: ArrowDownToLine },
  { href: "/dash/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/dash/team", label: "Team", icon: Users },
  { href: "/dash/bot", label: "Trading Bot", icon: Bot },
  { href: "/dash/business-plan", label: "Business Plan", icon: BookOpen },
  { href: "/dash/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dash/activity", label: "Activity", icon: Activity },
  { href: "/dash/history", label: "History", icon: History },
  { href: "/dash/support", label: "Support", icon: LifeBuoy },
  { href: "/dash/profile", label: "Profile", icon: User },
];

const SECTION_TITLES: Record<string, string> = {
  "/dash": "Home",
  "/dash/play": "Trade",
  "/dash/recharge": "Recharge",
  "/dash/withdraw": "Withdraw",
  "/dash/team": "Team",
  "/dash/bot": "Trading Bot",
  "/dash/business-plan": "Business Plan",
  "/dash/campaigns": "Campaigns",
  "/dash/activity": "Activity",
  "/dash/history": "History",
  "/dash/support": "Support",
  "/dash/profile": "Profile",
};

export function DashSidebar() {
  const pathname = usePathname();
  const [refCode, setRefCode] = useState("");
  const [copied, setCopied] = useState("");
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((j) => { if (j.ok) setRefCode(String(j.user?.referral_code || "")); }).catch(() => {});
  }, []);
  const refLink = typeof window !== "undefined" && refCode ? `${window.location.origin}/register?ref=${refCode}` : "";
  async function copy(what: "code" | "link") {
    const { copyText } = await import("@/lib/copy");
    const ok = await copyText(what === "code" ? refCode : refLink);
    setCopied(ok ? (what === "code" ? "Code copied ✓" : "Link copied ✓") : "Copy failed — long-press to copy");
    setTimeout(() => setCopied(""), 2000);
  }
  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-white/10 bg-[#0b1426] lg:flex">
      <div className="px-5 pb-2 pt-5">
        <Link href="/dash" className="text-lg font-black tracking-wide text-yellow-400">AVIATOR SMART AI</Link>
        <p className="text-[11px] uppercase tracking-widest text-slate-400">Member Panel</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 pt-2">
        {SIDE_NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${active ? "bg-yellow-300 font-bold text-black shadow-md" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {refCode && (
        <div className="mx-3 mb-2 rounded-2xl border border-yellow-300/25 bg-yellow-300/5 p-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">My Referral Code</p>
          <p className="mt-0.5 font-mono text-xl font-black text-yellow-300">{refCode}</p>
          <div className="mt-2 flex gap-1.5">
            <button onClick={() => copy("code")} className="flex-1 rounded-lg bg-yellow-300 px-2 py-1.5 text-xs font-black text-black hover:brightness-110">Copy Code</button>
            <button onClick={() => copy("link")} className="flex-1 rounded-lg border border-yellow-300/40 px-2 py-1.5 text-xs font-bold text-yellow-200 hover:bg-yellow-300/10">Copy Link</button>
          </div>
          {copied && <p className="mt-1.5 text-[11px] font-bold text-emerald-300">{copied}</p>}
        </div>
      )}
      <div className="border-t border-white/10 p-3">
        <Link href="/api/auth/logout" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          <LogOut className="h-[18px] w-[18px]" /> Logout
        </Link>
      </div>
    </aside>
  );
}

export function DashTopBar() {
  const pathname = usePathname();
  const title = SECTION_TITLES[pathname] ?? "Member Panel";
  return (
    <header className="sticky top-0 z-30 hidden border-b border-white/10 bg-[#0b1426]/90 backdrop-blur lg:block">
      <div className="flex items-center justify-between px-8 py-4">
        <h1 className="text-xl font-black">{title}</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dash/support" className="rounded-lg border border-white/15 px-3 py-2 text-slate-300 hover:bg-white/5">Support</Link>
          <Link href="/dash/profile" className="rounded-lg border border-white/15 px-3 py-2 text-slate-300 hover:bg-white/5">Profile</Link>
          <Link href="/api/auth/logout" className="flex items-center gap-2 rounded-lg bg-yellow-300 px-3 py-2 font-bold text-black hover:brightness-110">
            <LogOut className="h-4 w-4" /> Logout
          </Link>
        </div>
      </div>
    </header>
  );
}

export function DashBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/dash") return null;
  return (
    <div className="mb-4 hidden lg:block">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>
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

// Client rule: live social-proof ticker on the member dashboard.
// Fake rotation every 3–5 sec from 100 Indian names:
// - withdrawals ALWAYS under $20, - "just joined Aviator Smart AI" registrations.
// Pure frontend simulation — touches no wallets, no DB.
type FakeNotif = { id: number; icon: string; text: string };

function randomFakeNotif(): FakeNotif {
  const name = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)];
  const id = Date.now() + Math.floor(Math.random() * 100000);
  if (Math.random() < 0.6) {
    const amt = 1 + Math.floor(Math.random() * 19); // $1–$19, always under $20
    return { id, icon: "💸", text: `${name} withdrew $${amt}` };
  }
  return { id, icon: "🎉", text: `${name} just joined Aviator Smart AI` };
}

export function FakeNotifications() {
  const [items, setItems] = useState<FakeNotif[]>(() => [randomFakeNotif(), randomFakeNotif()]);
  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!alive) return;
      setItems((prev) => [randomFakeNotif(), ...prev].slice(0, 4));
      t = setTimeout(tick, 3000 + Math.random() * 2000);
    };
    t = setTimeout(tick, 3000);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);
  if (!items.length) return null;
  return (
    <div className="av-card space-y-1.5 px-3 py-2.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">🔔 Live updates</p>
      {items.map((n) => (
        <p key={n.id} className="text-sm">
          <span className="mr-1.5">{n.icon}</span>
          <span className="font-semibold">{n.text}</span>
        </p>
      ))}
    </div>
  );
}
