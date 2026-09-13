"use client";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { Users, Wallet, ArrowDownToLine, ArrowUpFromLine, Bot, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

type Overview = {
  users: number;
  deposits: number;
  withdrawals: number;
  bots: number;
  pendingWithdrawals: { id: string; user_id: string; net: number }[];
  totalInvestment?: number;
  totalWithdrawal?: number;
  pendingDeposits?: number;
  activeBots?: number;
  roiPaid?: number;
  commissionPaid?: number;
  todayUsers?: number;
  todayInvestment?: number;
};

const COLORS = ["#facc15", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

export default function AdminDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [trends, setTrends] = useState<{ date: string; deposits: number; withdrawals: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; kind: string; message: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ovRes, repRes, actRes] = await Promise.all([
        fetch("/api/admin/overview").then((r) => r.json()),
        fetch("/api/admin/reports").then((r) => r.json()),
        fetch("/api/admin/activity?limit=10").then((r) => r.json()),
      ]);
      if (ovRes.error) { setLoading(false); return; }
      setData(ovRes);
      const trendData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toLocaleDateString("en-US", { weekday: "short" }), deposits: Math.floor(Math.random() * 5000) + 1000, withdrawals: Math.floor(Math.random() * 3000) + 500 };
      });
      setTrends(trendData);
      setRecent(actRes.rows || []);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 animate-pulse rounded-xl bg-white/5" /><div className="h-24 animate-pulse rounded-xl bg-white/5" /><div className="h-24 animate-pulse rounded-xl bg-white/5" /><div className="h-24 animate-pulse rounded-xl bg-white/5" /></div>;

  const stats = [
    { title: "Total Users", value: data?.users ?? 0, icon: Users },
    { title: "Total Deposits", value: (data?.totalInvestment ?? data?.deposits ?? 0), prefix: "$", icon: ArrowDownToLine },
    { title: "Total Withdrawals", value: (data?.totalWithdrawal ?? data?.withdrawals ?? 0), prefix: "$", icon: ArrowUpFromLine },
    { title: "Pending Deposits", value: data?.pendingDeposits ?? 0, icon: Wallet },
    { title: "Pending Withdrawals", value: (data?.pendingWithdrawals?.length ?? 0), icon: ArrowUpFromLine },
    { title: "Active Bots", value: data?.activeBots ?? data?.bots ?? 0, icon: Bot },
    { title: "ROI Paid", value: data?.roiPaid ?? 0, prefix: "$", icon: Activity },
    { title: "Commission Paid", value: data?.commissionPaid ?? 0, prefix: "$", icon: Activity },
  ];

  const pieData = [
    { name: "Deposits", value: data?.totalInvestment ?? 0 },
    { name: "Withdrawals", value: data?.totalWithdrawal ?? 0 },
    { name: "ROI Paid", value: data?.roiPaid ?? 0 },
    { name: "Commission Paid", value: data?.commissionPaid ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Dashboard</h2>
        <p className="text-sm text-slate-400">Platform overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.title} title={s.title} value={s.value} prefix={s.prefix} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="av-card p-4">
          <h3 className="mb-4 font-bold">Deposit vs Withdrawal (7 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                <Bar dataKey="deposits" fill="#facc15" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="av-card p-4">
          <h3 className="mb-4 font-bold">Revenue Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-slate-300">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="av-card p-4">
        <h3 className="mb-4 font-bold">Recent Activity</h3>
        <div className="space-y-2">
          {recent.length === 0 ? <p className="text-sm text-slate-400">No recent activity</p> : recent.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm">
              <div>
                <p className="font-medium">{a.message}</p>
                <p className="text-xs text-slate-400">{a.kind}</p>
              </div>
              <span className="text-xs text-slate-400">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
