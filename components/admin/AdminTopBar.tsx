"use client";
import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import Link from "next/link";

type Alert = { id: string; title: string; sub: string; href: string };

export function AdminTopBar({ admin }: { admin: { name: string; email: string; referral_code: string } }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [ov, act] = await Promise.all([
          fetch("/api/admin/overview", { credentials: "include" }).then((r) => r.json()),
          fetch("/api/admin/activity?limit=6", { credentials: "include" }).then((r) => r.json()),
        ]);
        const list: Alert[] = [];
        const pd = ov.pendingDeposits ?? 0;
        const pw = Array.isArray(ov.pendingWithdrawals) ? ov.pendingWithdrawals.length : (ov.pendingWithdrawals ?? 0);
        if (pd > 0) list.push({ id: "pd", title: `${pd} pending deposit${pd > 1 ? "s" : ""}`, sub: "Needs approval", href: "/admin/deposits" });
        if (pw > 0) list.push({ id: "pw", title: `${pw} pending withdrawal${pw > 1 ? "s" : ""}`, sub: "Needs review", href: "/admin/withdrawals" });
        for (const a of (act.rows || []).slice(0, 4)) {
          list.push({ id: String((a as Record<string, unknown>).id), title: String((a as Record<string, unknown>).message ?? "Activity"), sub: String((a as Record<string, unknown>).kind ?? ""), href: "/admin/activity" });
        }
        setAlerts(list);
      } catch {}
    }
    load();
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[#f0e6d2] bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="ml-10 lg:ml-0">
          <p className="hidden text-xs uppercase tracking-widest text-gray-400 sm:block">Aviator Pro · Admin</p>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search users, deposits..." className="w-56 rounded-xl border border-[#e9dfc9] bg-[#faf6ee] py-2 pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#e8821e] focus:outline-none" onKeyDown={(e) => { if (e.key === "Enter") window.location.href = `/admin/users?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`; }} />
          </div>
          <div className="relative">
            <button onClick={() => setShow((s) => !s)} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#faf6ee] text-gray-600 hover:bg-[#f3ead6]" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">{alerts.length}</span>}
            </button>
            {show && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShow(false)} />
                <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-[#f0e6d2] bg-white shadow-xl">
                  <p className="border-b border-[#f5eddc] px-4 py-3 text-sm font-bold text-gray-900">Notifications</p>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.length === 0 && <p className="px-4 py-6 text-center text-sm text-gray-400">All clear. Nothing needs attention.</p>}
                    {alerts.map((a) => (
                      <Link key={a.id} href={a.href} onClick={() => setShow(false)} className="block border-b border-[#f8f2e4] px-4 py-3 last:border-0 hover:bg-[#faf6ee]">
                        <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-500">{a.sub}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 border-l border-[#f0e6d2] pl-2 md:pl-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e8821e] text-sm font-bold text-white">{admin.name?.[0]?.toUpperCase() || "A"}</div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-bold text-gray-900">{admin.name}</p>
              <p className="text-xs text-gray-500">{admin.referral_code}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
