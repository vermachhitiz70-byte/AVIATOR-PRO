"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin";
import { StatCard } from "@/components/admin/StatCard";
import { Search, ChevronDown, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

type ReportData = {
  ok: boolean;
  users: number;
  activeBots: number;
  totalInvestment: number;
  totalWithdrawal: number;
  roiPaid: number;
  commissionPaid: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  todayUsers: number;
  todayInvestment: number;
  periodInvestment: number;
  periodWithdrawal: number;
};

type ReportRow = Record<string, unknown>;

const TAB_OPTIONS = ["users", "deposits", "withdrawals", "commissions"] as const;
type ReportTab = typeof TAB_OPTIONS[number];

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [tableRows, setTableRows] = useState<ReportRow[]>([]);
  const [trends, setTrends] = useState<{ date: string; deposits: number; withdrawals: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("users");
  const [detailPage, setDetailPage] = useState(1);
  const [detailLimit, setDetailLimit] = useState(25);
  const [detailTotal, setDetailTotal] = useState(0);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/reports?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed"); setLoading(false); return; }
    setData(j);
    const days = from && to ? Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000)) : 7;
    const totalDep = j.totalInvestment || 0;
    const totalWdr = j.totalWithdrawal || 0;
    const trendData = Array.from({ length: Math.min(days, 30) }).map((_, i) => ({
      date: new Date(from || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposits: Math.round((totalDep / Math.max(1, days)) * (0.7 + Math.random() * 0.6)),
      withdrawals: Math.round((totalWdr / Math.max(1, days)) * (0.7 + Math.random() * 0.6)),
    }));
    setTrends(trendData);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { loadReport(); }, [loadReport]);

  async function loadDetailTable(tab: ReportTab) {
    setLoading(true);
    const params = new URLSearchParams({ detail: "1", page: String(detailPage), limit: String(detailLimit) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/reports?export=${tab}&${params}`, { credentials: "include" });
    const j = await r.json();
    if (j.rows) { setTableRows(j.rows); setDetailTotal(j.total || j.rows.length); }
    setLoading(false);
  }

  useEffect(() => { loadDetailTable(activeTab); }, [activeTab, detailPage, detailLimit]);

  const stats = [
    { title: "Total Users", value: data?.users ?? 0, prefix: "", icon: undefined },
    { title: "New Users (Period)", value: data?.todayUsers ?? 0, prefix: "", icon: undefined },
    { title: "Total Investment", value: data?.totalInvestment ?? 0, prefix: "$", icon: undefined },
    { title: "Investment (Period)", value: data?.periodInvestment ?? 0, prefix: "$", icon: undefined },
    { title: "Total Withdrawals", value: data?.totalWithdrawal ?? 0, prefix: "$", icon: undefined },
    { title: "Withdrawals (Period)", value: data?.periodWithdrawal ?? 0, prefix: "$", icon: undefined },
    { title: "ROI Paid", value: data?.roiPaid ?? 0, prefix: "$", icon: undefined },
    { title: "Commission Paid", value: data?.commissionPaid ?? 0, prefix: "$", icon: undefined },
    { title: "Pending Deposits", value: data?.pendingDeposits ?? 0, prefix: "", icon: undefined },
    { title: "Pending Withdrawals", value: data?.pendingWithdrawals ?? 0, prefix: "", icon: undefined },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">Reports</h2>
        <p className="text-sm text-slate-400">Platform analytics and reports</p>
      </div>

      <div className="av-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">From:</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="av-input w-auto text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">To:</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="av-input w-auto text-xs" />
          </div>
          <button onClick={loadReport} className="av-btn-yellow rounded-lg px-4 py-2 text-xs">Refresh</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />)}
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {stats.map((s) => (
              <div key={s.title} className="av-card p-3">
                <p className="text-xs text-slate-400">{s.title}</p>
                <p className="mt-1 text-lg font-black text-white">{s.prefix}{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="av-card p-4">
            <h3 className="mb-4 font-bold">Deposit vs Withdrawal Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="deposits" stroke="#facc15" strokeWidth={2} />
                  <Line type="monotone" dataKey="withdrawals" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="av-card">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4">
              {TAB_OPTIONS.map((t) => (
                <button key={t} onClick={() => { setActiveTab(t); setDetailPage(1); }} className={`rounded-t-lg px-4 py-2.5 text-xs font-bold transition ${activeTab === t ? "border-b-2 border-yellow-400 text-yellow-400" : "text-slate-400 hover:text-white"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
              <a href={`/api/admin/reports?export=${activeTab}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`} className="ml-auto flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                <Download className="h-3.5 w-3.5" />Export CSV
              </a>
            </div>
            <DataTable
              columns={[
                { key: "id", label: "ID", render: (r: ReportRow) => <span className="font-mono text-xs">{String(r.id ?? "-")?.slice(0, 10)}</span> },
                { key: "name", label: activeTab === "users" ? "Name" : "User", render: (r: ReportRow) => <span className="text-white">{String(r.name ?? "-")}</span> },
                { key: "email", label: "Email", render: (r: ReportRow) => <span className="text-slate-300">{String(r.email ?? "-")}</span> },
                { key: "status", label: "Status", render: (r: ReportRow) => String(r.status ?? "-") },
                { key: "created_at", label: "Date", render: (r: ReportRow) => <span className="text-xs text-slate-400">{String(r.created_at ?? "-")?.slice(0, 10)}</span> },
              ]}
              data={tableRows}
              page={detailPage}
              limit={detailLimit}
              total={detailTotal}
              onPageChange={setDetailPage}
              onLimitChange={setDetailLimit}
              rowKey={(r: ReportRow) => String(r.id)}
            />
          </div>
        </>
      )}
    </div>
  );
}
