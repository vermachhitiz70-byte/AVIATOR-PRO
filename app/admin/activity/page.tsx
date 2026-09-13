"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin";
import { CARD, INPUT, fmtDate, pill } from "@/components/admin/ui";
import { Search, ChevronDown } from "lucide-react";

type ActivityRow = Record<string, unknown>;

const KIND_OPTIONS = ["", "registration", "investment", "deposit_confirm", "deposit_approved", "withdrawal_approved", "admin_action", "daily_roi", "first_recharge", "roi_level"];

export default function AdminActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [error, setError] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [q, setQ] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (kindFilter) params.set("kind", kindFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/activity?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
  }, [page, limit, kindFilter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: "id", label: "ID", render: (r: ActivityRow) => <span className="font-mono text-xs text-gray-500">#{String(r.id ?? "-").slice(0, 10)}</span> },
    { key: "kind", label: "Event", render: (r: ActivityRow) => pill(String(r.kind ?? "-").replace(/_/g, " ")) },
    { key: "message", label: "Details", render: (r: ActivityRow) => <span className="text-gray-700">{String(r.message ?? "-")}</span> },
    { key: "created_at", label: "Date", render: (r: ActivityRow) => <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Activity Log</h1>
        <p className="mt-1 text-sm text-gray-500">Every important platform event in one place · {total} total</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search events..." className={`${INPUT} pl-9`} />
          </div>
          <div className="relative">
            <select value={kindFilter} onChange={(e) => { setKindFilter(e.target.value); setPage(1); }} className={`${INPUT} pr-8`}>
              {KIND_OPTIONS.map((k) => <option key={k} value={k}>{k ? k.replace(/_/g, " ") : "All Events"}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: ActivityRow) => String(r.id)} />
      </div>
    </div>
  );
}
