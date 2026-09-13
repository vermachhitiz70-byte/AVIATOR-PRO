"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin";
import { Search, ChevronDown } from "lucide-react";

type ActivityRow = Record<string, unknown>;

const KIND_OPTIONS = ["", "registration", "deposit_approved", "withdrawal_approved", "admin_action", "user_action", "bot_created", "kyc_updated"];

export default function AdminActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (kindFilter) params.set("kind", kindFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/activity?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setLoading(false);
  }, [page, limit, kindFilter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kindColors: Record<string, string> = {
    registration: "bg-blue-500/20 text-blue-400",
    deposit_approved: "bg-emerald-500/20 text-emerald-400",
    withdrawal_approved: "bg-yellow-500/20 text-yellow-400",
    admin_action: "bg-red-500/20 text-red-400",
    user_action: "bg-purple-500/20 text-purple-400",
    bot_created: "bg-cyan-500/20 text-cyan-400",
    kyc_updated: "bg-pink-500/20 text-pink-400",
  };

  const columns = [
    { key: "id", label: "ID", render: (r: ActivityRow) => <span className="font-mono text-xs text-slate-300">#{String(r.id ?? "-")?.slice(0, 10)}</span> },
    { key: "kind", label: "Kind", render: (r: ActivityRow) => {
      const k = String(r.kind ?? "-");
      return <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${kindColors[k] || "bg-white/10 text-slate-300"}`}>{k}</span>;
    }},
    { key: "message", label: "Message", render: (r: ActivityRow) => <span className="text-slate-300">{String(r.message ?? "-")}</span> },
    { key: "created_at", label: "Date", render: (r: ActivityRow) => <span className="text-xs text-slate-400">{new Date(String(r.created_at)).toLocaleString()}</span> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">Activity Log</h2>
        <p className="text-sm text-slate-400">Platform activity history</p>
      </div>

      <div className="av-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search activity..." className="av-input pl-9" />
          </div>
          <div className="relative">
            <select value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(1); }} className="av-input pr-8">
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k ? k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "All Kinds"}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="av-card">
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: ActivityRow) => String(r.id)} />
      </div>
    </div>
  );
}
