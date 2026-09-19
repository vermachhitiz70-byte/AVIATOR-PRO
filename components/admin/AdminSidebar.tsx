"use client";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, ArrowDownToLine, ArrowUpFromLine, Bot, Megaphone, Ticket, Activity, BarChart3, Settings, Menu, X, LogOut, Plane, Wallet, ReceiptText, Network } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cachedGet } from "./cachedFetch";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/earnings", label: "Earnings", icon: Wallet },
  { href: "/admin/trail", label: "Money Trail", icon: ReceiptText },
  { href: "/admin/tree", label: "Tree", icon: Network },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine, badgeKey: "pendingDeposits" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, badgeKey: "pendingWithdrawals" },
  { href: "/admin/bots", label: "Bots", icon: Bot },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/tickets", label: "Support Tickets", icon: Ticket, badgeKey: "openTickets" },
  { href: "/admin/activity", label: "Activity Log", icon: Activity },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ admin }: { admin: { name: string; email: string; referral_code: string } }) {
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const pathname = usePathname();

  useEffect(() => {
    cachedGet<{ error?: string; pendingDeposits?: number; pendingWithdrawals?: number }>("/api/admin/overview")
      .then((j) => {
        if (!j || j.error) return;
        setBadges({
          pendingDeposits: j.pendingDeposits ?? 0,
          pendingWithdrawals: Array.isArray(j.pendingWithdrawals) ? j.pendingWithdrawals.length : (j.pendingWithdrawals ?? 0),
        });
      })
      .catch(() => {});
    cachedGet<{ ok?: boolean; total?: number }>("/api/admin/tickets?status=open&limit=1")
      .then((j) => { if (j && j.ok) setBadges((p) => ({ ...p, openTickets: j.total ?? 0 })); })
      .catch(() => {});
  }, []);

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 rounded-xl bg-[#1d1d2e] p-2 text-white shadow-lg lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-[#1d1d2e] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8821e]"><Plane className="h-5 w-5 text-white" /></span>
            <div>
              <h1 className="font-serif text-lg font-bold leading-tight tracking-wide">AVIATOR SMART AI</h1>
              <p className="text-[11px] uppercase tracking-widest text-white/50">Admin Console</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-white/60 hover:text-white lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <div className="mx-5 mb-3 mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8821e] text-base font-bold">{admin.name?.[0]?.toUpperCase() || "A"}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{admin.name}</p>
            <p className="truncate text-xs text-white/50">{admin.email}</p>
            <span className="mt-1 inline-block rounded-md bg-[#e8821e]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f5a623]">Admin · {admin.referral_code}</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const badge = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${active ? "bg-[#e8821e] text-white shadow-md" : "text-white/65 hover:bg-white/5 hover:text-white"}`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-white text-[#e8821e]" : "bg-red-500 text-white"}`}>{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link href="/login" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/65 hover:bg-white/5 hover:text-white">
            <LogOut className="h-[18px] w-[18px]" /> Logout
          </Link>
        </div>
      </aside>
    </>
  );
}
