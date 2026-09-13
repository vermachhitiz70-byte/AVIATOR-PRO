"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/admin/StatCard";
import { CARD, fmtDate, fmtUSD, pill } from "@/components/admin/ui";
import { ArrowDownToLine, ArrowUpFromLine, Clock3, TriangleAlert, Users, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Overview = {
  users: number;
  deposits: number;
  withdrawals: number;
  bots: number;
  activeBots: number;
  pendingDeposits: number;
  pendingWithdrawals: { id: string; user_id: string; net: number }[];
  pendingDepositsList: Record<string, unknown>[];
  totalInvestment: number;
  totalWithdrawal: number;
  roiPaid: number;
  commissionPaid: number;
  daily: { date: string; label: string; deposits: number; withdrawals: number }[];
  usersTrendPct: number;
  investmentTrendPct: number;
  recentDeposits: Record<string, unknown>[];
  recentWithdrawals: Record<string, unknown>[];
};

type ActivityRow = { id: string; kind: string; message: string; created_at: string };

const trendText = (pct: number) => `${pct >= 0 ? "+" : ""}${pct}%`;

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ovRes, actRes] = await Promise.all([
        fetch("/api/admin/overview", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/admin/activity?limit=6", { credentials: "include" }).then((r) => r.json()),
      ]);
      if (!ovRes.error) setData(ovRes);
      setRecent(actRes.rows || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div><div className="h-9 w-64 animate-pulse rounded-lg bg-[#eee4cd]" /><div className="mt-2 h-4 w-44 animate-pulse rounded bg-[#eee4cd]" /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div>
      </div>
    );
  }

  const pwCount = data?.pendingWithdrawals?.length ?? 0;
  const pdCount = data?.pendingDeposits ?? 0;
  const approvals = (data?.pendingDepositsList || []).map((d) => ({
    id: String(d.id),
    title: `${d.name} · ${fmtUSD(d.actual ?? d.requested)}`,
    sub: `${d.email} · ${fmtDate(d.created_at)}`,
    tag: "deposit",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900 md:text-4xl">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back, Admin!</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={data?.users ?? 0} icon={Users} tint="teal" trend={trendText(data?.usersTrendPct ?? 0)} />
        <StatCard title="Total Investment" value={data?.totalInvestment ?? 0} prefix="$" icon={Wallet} tint="green" trend={trendText(data?.investmentTrendPct ?? 0)} />
        <StatCard title="Pending Deposits" value={pdCount} icon={ArrowDownToLine} tint="orange" trend={pdCount > 0 ? `${pdCount} to review` : "Clear"} />
        <StatCard title="Pending Withdrawals" value={pwCount} icon={ArrowUpFromLine} tint="purple" trend={pwCount > 0 ? `${pwCount} to review` : "Clear"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900"><Clock3 className="h-4 w-4 text-[#e8821e]" /> Pending Approvals</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-[#b45309]">{pdCount + pwCount}</span>
          </div>
          <div className="space-y-2">
            {approvals.length === 0 && pwCount === 0 && <p className="rounded-xl bg-[#faf6ee] px-4 py-6 text-center text-sm text-gray-400">Nothing waiting. All deposits and withdrawals are processed.</p>}
            {approvals.map((a) => (
              <Link key={a.id} href="/admin/deposits" className="flex items-center justify-between gap-3 rounded-xl bg-[#faf6ee] px-4 py-3 hover:bg-[#f5eddc]">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900">{a.title}</p>
                  <p className="truncate text-xs text-gray-500">{a.sub}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">pending</span>
              </Link>
            ))}
            {pwCount > 0 && (
              <Link href="/admin/withdrawals" className="flex items-center justify-between gap-3 rounded-xl bg-[#faf6ee] px-4 py-3 hover:bg-[#f5eddc]">
                <div><p className="text-sm font-bold text-gray-900">{pwCount} withdrawal{pwCount > 1 ? "s" : ""} awaiting payout</p><p className="text-xs text-gray-500">Review amounts and wallet addresses</p></div>
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">review</span>
              </Link>
            )}
          </div>
        </div>

        <div className={`${CARD} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-gray-900"><TriangleAlert className="h-4 w-4 text-[#e8821e]" /> Recent Activity</h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-[#b45309]">{recent.length} latest</span>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {recent.length === 0 && <p className="rounded-xl bg-[#faf6ee] px-4 py-6 text-center text-sm text-gray-400">No activity yet.</p>}
            {recent.map((a) => (
              <div key={a.id} className="rounded-xl bg-[#faf6ee] px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{a.message}</p>
                <p className="mt-0.5 text-xs text-gray-500">{a.kind} · {fmtDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <h2 className="mb-4 text-base font-bold text-gray-900">Deposit Inflow · Last 7 Days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d2" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: "#e9dfc9" }} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #f0e6d2", borderRadius: "12px" }} />
                <Bar dataKey="deposits" fill="#e8821e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className={`${CARD} p-5`}>
          <h2 className="mb-4 text-base font-bold text-gray-900">Withdrawal Outflow · Last 7 Days</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.daily || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d2" vertical={false} />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: "#e9dfc9" }} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #f0e6d2", borderRadius: "12px" }} />
                <Bar dataKey="withdrawals" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-base font-bold text-gray-900">Recent Deposits</h2>
          <Link href="/admin/deposits" className="text-xs font-semibold text-[#e8821e] hover:underline">View all ↗</Link>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#f0e6d2] text-xs uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Request</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentDeposits || []).map((d) => (
                <tr key={String(d.id)} className="border-b border-[#f8f2e4] last:border-0 hover:bg-orange-50/50">
                  <td className="px-4 py-3"><p className="font-semibold text-gray-900">{String(d.name ?? "-")}</p><p className="text-xs text-gray-500">{String(d.email ?? "")}</p></td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{String(d.request_id ?? "-")}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmtUSD(d.actual)}</td>
                  <td className="px-4 py-3">{pill(d.status)}</td>
                </tr>
              ))}
              {(data?.recentDeposits || []).length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No deposits yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
