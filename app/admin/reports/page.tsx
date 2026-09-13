"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin";
import { StatCard } from "@/components/admin/StatCard";
import { BTN_PRIMARY, CARD, INPUT, fmtUSD } from "@/components/admin/ui";
import { Download, Users, Wallet, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("users");
  const [detailPage, setDetailPage] = useState(1);
  const [detailLimit, setDetailLimit] = useState(25);
  const [detailTotal, setDetailTotal] = useState(0);

  const loadReport = useCallback(async () => {
    setError("");
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/reports?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed"); return; }
    setData(j);
  }, [from, to]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const loadDetailTable = useCallback(async () => {
    const params = new URLSearchParams({ detail: "1", page: String(detailPage), limit: String(detailLimit) });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/reports?export=${activeTab}&${params}`, { credentials: "include" });
    const j = await r.json();
    if (j.rows) { setTableRows(j.rows); setDetailTotal(j.total || j.rows.length); }
  }, [activeTab, detailPage, detailLimit, from, to]);

  useEffect(() => { loadDetailTable(); }, [loadDetailTable]);

  const chartData = [
    { name: "Investment", amount: data?.totalInvestment ?? 0 },
    { name: "Withdrawals", amount: data?.totalWithdrawal ?? 0 },
    { name: "ROI Paid", amount: data?.roiPaid ?? 0 },
    { name: "Commission", amount: data?.commissionPaid ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Platform analytics with date filtering and CSV export</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${INPUT} w-auto text-xs`} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${INPUT} w-auto text-xs`} />
          </div>
          <button onClick={() => { loadReport(); setDetailPage(1); }} className={`${BTN_PRIMARY} px-5 py-2 text-xs`}>Apply Filter</button>
          {(from || to) && <button onClick={() => { setFrom(""); setTo(""); }} className="text-xs font-semibold text-gray-500 hover:text-gray-800">Clear</button>}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      {!data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-white" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Users" value={data.users} icon={Users} tint="teal" />
            <StatCard title="Total Investment" value={data.totalInvestment} prefix="$" icon={Wallet} tint="green" />
            <StatCard title="Period Investment" value={data.periodInvestment} prefix="$" icon={ArrowDownToLine} tint="orange" />
            <StatCard title="Period Withdrawals" value={data.periodWithdrawal} prefix="$" icon={ArrowUpFromLine} tint="purple" />
            <StatCard title="Total Withdrawals" value={data.totalWithdrawal} prefix="$" icon={ArrowUpFromLine} tint="blue" />
            <StatCard title="ROI Paid" value={data.roiPaid} prefix="$" icon={Wallet} tint="green" />
            <StatCard title="Commission Paid" value={data.commissionPaid} prefix="$" icon={Wallet} tint="orange" />
            <StatCard title="Active Bots" value={data.activeBots} icon={Users} tint="teal" />
          </div>

          <div className={`${CARD} p-5`}>
            <h2 className="mb-4 text-base font-bold text-gray-900">Money Flow Overview</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0e6d2" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={{ stroke: "#e9dfc9" }} />
                  <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #f0e6d2", borderRadius: "12px" }} formatter={(v) => fmtUSD(v)} />
                  <Bar dataKey="amount" fill="#e8821e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={CARD}>
            <div className="flex flex-wrap items-center gap-2 border-b border-[#f0e6d2] px-4 pt-2">
              {TAB_OPTIONS.map((t) => (
                <button key={t} onClick={() => { setActiveTab(t); setDetailPage(1); }} className={`rounded-t-lg px-4 py-2.5 text-xs font-bold transition ${activeTab === t ? "border-b-2 border-[#e8821e] text-[#e8821e]" : "text-gray-400 hover:text-gray-700"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
              <a href={`/api/admin/reports?export=${activeTab}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`} className="mb-2 ml-auto flex items-center gap-1.5 rounded-xl border border-[#e9dfc9] px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-[#faf6ee]">
                <Download className="h-3.5 w-3.5" />Export CSV
              </a>
            </div>
            <DataTable
              columns={[
                { key: "id", label: "ID", render: (r: ReportRow) => <span className="font-mono text-xs text-gray-500">{String(r.id ?? "-").slice(0, 10)}</span> },
                { key: "name", label: activeTab === "users" ? "Name" : "User", render: (r: ReportRow) => <span className="font-semibold text-gray-900">{String(r.name ?? "-")}</span> },
                { key: "email", label: "Email", render: (r: ReportRow) => <span className="text-gray-500">{String(r.email ?? "-")}</span> },
                { key: "status", label: "Status", render: (r: ReportRow) => <span className="text-gray-600">{String(r.status ?? "-")}</span> },
                { key: "created_at", label: "Date", render: (r: ReportRow) => <span className="text-xs text-gray-500">{String(r.created_at ?? "-").slice(0, 10)}</span> },
              ]}
              data={tableRows} page={detailPage} limit={detailLimit} total={detailTotal}
              onPageChange={setDetailPage} onLimitChange={setDetailLimit} rowKey={(r: ReportRow) => String(r.id)} />
          </div>
        </>
      )}
    </div>
  );
}
