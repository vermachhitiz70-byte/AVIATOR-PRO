"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { Search, Check, X, ChevronDown } from "lucide-react";

type DepositRow = Record<string, unknown>;

const TABS = ["pending", "confirmed", "rejected", "all"] as const;
type Tab = typeof TABS[number];

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkApproveOpen, setBulkApproveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [actualAmt, setActualAmt] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status: tab === "all" ? "" : tab });
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/deposits?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setSelected(new Set());
    setLoading(false);
  }, [page, limit, tab, q, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => String(r.id))));
  }

  async function postAction(body: Record<string, unknown>) {
    setSubmitting(true);
    const r = await fetch("/api/admin/deposits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    fetchData();
  }

  function openApprove(id: string) { setActiveId(id); setActualAmt(""); setRemark(""); setApproveOpen(true); }
  function openReject(id: string) { setActiveId(id); setRemark(""); setRejectOpen(true); }

  async function submitApprove() {
    if (!activeId) return;
    await postAction({ id: activeId, action: "approve", actual: actualAmt ? Number(actualAmt) : undefined, remark });
    setApproveOpen(false);
  }

  async function submitReject() {
    if (!activeId) return;
    await postAction({ id: activeId, action: "reject", remark });
    setRejectOpen(false);
  }

  async function submitBulkApprove() {
    for (const id of selected) await postAction({ id, action: "approve", actual: actualAmt ? Number(actualAmt) : undefined, remark });
    setBulkApproveOpen(false);
  }

  async function submitBulkReject() {
    for (const id of selected) await postAction({ id, action: "reject", remark });
    setBulkRejectOpen(false);
  }

  const statusColors: Record<string, string> = { pending: "bg-yellow-500/20 text-yellow-400", confirmed: "bg-emerald-500/20 text-emerald-400", rejected: "bg-red-500/20 text-red-400" };

  const columns = [
    { key: "name", label: "User", render: (r: DepositRow) => <span className="font-medium text-white">{String(r.name ?? "-")}</span> },
    { key: "request_id", label: "Request ID", render: (r: DepositRow) => <span className="font-mono text-xs text-slate-300">{String(r.request_id ?? "-")}</span> },
    { key: "requested", label: "Requested", render: (r: DepositRow) => <span className="text-white">${Number(r.requested ?? 0).toLocaleString()}</span> },
    { key: "actual", label: "Actual", render: (r: DepositRow) => <span className="text-emerald-400">${Number(r.actual ?? 0).toLocaleString()}</span> },
    { key: "tx_hash", label: "TX Hash", render: (r: DepositRow) => <span className="font-mono text-xs text-slate-300">{String(r.tx_hash ?? "-")?.slice(0, 16) || "-"}</span> },
    { key: "status", label: "Status", render: (r: DepositRow) => <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${statusColors[String(r.status)] || "bg-white/10 text-slate-300"}`}>{String(r.status ?? "-")}</span> },
    { key: "created_at", label: "Date", render: (r: DepositRow) => <span className="text-xs text-slate-400">{new Date(String(r.created_at)).toLocaleDateString()}</span> },
    { key: "actions", label: "Actions", render: (r: DepositRow) => {
      const s = String(r.status);
      return (
        <div className="flex gap-1">
          {s === "pending" && <>
            <button onClick={() => openApprove(String(r.id))} className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-400 hover:bg-emerald-500/30"><Check className="h-3.5 w-3.5" /></button>
            <button onClick={() => openReject(String(r.id))} className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30"><X className="h-3.5 w-3.5" /></button>
          </>}
          {s !== "pending" && <span className="text-xs text-slate-500">-</span>}
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">Deposits</h2>
        <p className="text-sm text-slate-400">Manage deposit requests</p>
      </div>

      <div className="av-card p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${tab === t ? "av-btn-yellow" : "border border-white/10 text-slate-300 hover:bg-white/5"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email, tx hash..." className="av-input pl-9" />
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="av-input w-auto text-xs" />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="av-input w-auto text-xs" />
          {selected.size > 0 && (
            <div className="flex gap-2">
              <button onClick={() => { setActualAmt(""); setRemark(""); setBulkApproveOpen(true); }} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30">Approve ({selected.size})</button>
              <button onClick={() => { setRemark(""); setBulkRejectOpen(true); }} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/30">Reject ({selected.size})</button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="av-card">
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: DepositRow) => String(r.id)} selectedIds={selected} onToggleSelect={toggleSelect} onToggleAll={toggleAll} />
      </div>

      {approveOpen && (
        <Modal isOpen={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Deposit">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Actual Amount (optional)</label>
              <input type="number" value={actualAmt} onChange={(e) => setActualAmt(e.target.value)} placeholder="Leave empty to use requested amount" className="av-input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Remark</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional remark" className="av-input" rows={2} />
            </div>
            <button onClick={submitApprove} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Processing..." : "Approve"}</button>
          </div>
        </Modal>
      )}

      {rejectOpen && (
        <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Deposit">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Remark (required)</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason for rejection" className="av-input" rows={2} />
            </div>
            <button onClick={submitReject} disabled={submitting || !remark.trim()} className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Processing..." : "Reject"}</button>
          </div>
        </Modal>
      )}

      {bulkApproveOpen && (
        <Modal isOpen={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} title="Bulk Approve">
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Approving {selected.size} deposits</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Actual Amount (optional, applies to all)</label>
              <input type="number" value={actualAmt} onChange={(e) => setActualAmt(e.target.value)} placeholder="Leave empty for requested amount" className="av-input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Remark</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional remark" className="av-input" rows={2} />
            </div>
            <button onClick={submitBulkApprove} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Processing..." : "Approve All"}</button>
          </div>
        </Modal>
      )}

      {bulkRejectOpen && (
        <Modal isOpen={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} title="Bulk Reject">
          <div className="space-y-4">
            <p className="text-sm text-slate-300">Rejecting {selected.size} deposits</p>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Remark</label>
              <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason for rejection" className="av-input" rows={2} />
            </div>
            <button onClick={submitBulkReject} disabled={submitting || !remark.trim()} className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? "Processing..." : "Reject All"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
