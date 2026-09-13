"use client";
import { useState } from "react";
import { LayoutDashboard, Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Bot, Megaphone, Ticket, Activity, BarChart3, Settings, Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/deposits", label: "Deposits", icon: ArrowDownToLine },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { href: "/admin/bots", label: "Bots", icon: Bot },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ admin }: { admin: { name: string; email: string; referral_code: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-50 rounded-lg bg-white/10 p-2 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/10 bg-[#0b0f19] transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-black text-yellow-400">AVIATOR PRO</h1>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="space-y-1 px-2">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-yellow-500/10 text-yellow-400" : "text-slate-300 hover:bg-white/5"}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-bold text-yellow-400">{admin.name?.[0]?.toUpperCase() || "A"}</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{admin.name}</p>
              <p className="truncate text-xs text-slate-400">{admin.referral_code}</p>
            </div>
          </div>
          <Link href="/login" className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Link>
        </div>
      </aside>
    </>
  );
}
