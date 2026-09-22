"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal } from "@/components/admin";
import { BTN_GHOST, BTN_PRIMARY, BTN_RED, CARD, INPUT, LABEL, fmtDate, fmtUSD, pill } from "@/components/admin/ui";
import { Search, Check, X } from "lucide-react";

type DepositRow = Record<string, unknown>;

function TxCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value || value === "-") return <span className="text-xs text-gray-300">—</span>;
  async function copy() {
    const { copyText } = await import("@/lib/copy");
    const ok = await copyText(value);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <span className="block max-w-[220px]">
      <span className="block break-all font-mono text-xs text-gray-700">{value}</span>
      <button onClick={copy} title="Copy full TX hash" className="mt-1 rounded-lg border border-[#e9dfc9] px-2 py-1 text-[11px] font-bold text-[#b45309] hover:bg-[#faf6ec]">
        {copied ? "Copied ✓" : "Copy"}
      </button>
    </span>
  );
}

const TABS = ["pending", "confirmed", "rejected", "all"] as const;
type Tab = typeof TABS[number];

export default function AdminDepositsPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
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
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status: tab === "all" ? "" : tab });
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/deposits?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setSelected(new Set());
  }, [page, limit, tab, q, from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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
    for (const id of selected) await postAction({ id, action: "approve", remark });
    setBulkApproveOpen(false);
  }
  async function submitBulkReject() {
    for (const id of selected) await postAction({ id, action: "reject", remark });
    setBulkRejectOpen(false);
  }

  const columns = [
    { key: "name", label: "User", render: (r: DepositRow) => (<span><span className="block font-semibold text-gray-900">{String(r.name ?? "-")}</span><span className="block text-xs text-gray-500">{String(r.email ?? "")}</span></span>) },
    { key: "request_id", label: "Request ID", render: (r: DepositRow) => <span className="font-mono text-xs text-gray-500">{String(r.request_id ?? "-")}</span> },
    { key: "requested", label: "Requested", render: (r: DepositRow) => <span className="font-semibold text-gray-900">{fmtUSD(r.requested)}</span> },
    { key: "actual", label: "Actual", render: (r: DepositRow) => <span className="font-bold text-green-700">{fmtUSD(r.actual)}</span> },
    { key: "tx_hash", label: "TX Hash", render: (r: DepositRow) => <TxCell value={String(r.tx_hash ?? "-")} /> },
    { key: "screenshot_url", label: "Screenshot", render: (r: DepositRow) => (r.screenshot_url ? <a href={String(r.screenshot_url)} target="_blank" rel="noopener"><img src={String(r.screenshot_url)} alt="proof" className="h-12 w-16 rounded-lg border object-cover" /></a> : <span className="text-xs text-gray-400">—</span>) },
    { key: "status", label: "Status", render: (r: DepositRow) => pill(r.status) },
    { key: "created_at", label: "Date", render: (r: DepositRow) => <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span> },
    { key: "actions", label: "Actions", render: (r: DepositRow) => {
      if (String(r.status) !== "pending") return <span className="text-xs text-gray-400">—</span>;
      return (
        <div className="flex gap-1.5">
          <button onClick={() => openApprove(String(r.id))} title="Approve" className="rounded-lg bg-green-100 p-1.5 text-green-700 hover:bg-green-200"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={() => openReject(String(r.id))} title="Reject" className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200"><X className="h-3.5 w-3.5" /></button>
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Deposits</h1>
        <p className="mt-1 text-sm text-gray-500">Approve requests to credit Principal + trigger referral commissions · {total} total</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="mb-3 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${tab === t ? "bg-[#e8821e] text-white shadow-sm" : "border border-[#e9dfc9] bg-white text-gray-500 hover:bg-[#faf6ec]"}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search name, email, TX hash..." className={`${INPUT} pl-9`} />
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${INPUT} w-auto text-xs`} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${INPUT} w-auto text-xs`} />
          {selected.size > 0 && (
            <div className="flex gap-2">
              <button onClick={() => { setRemark(""); setBulkApproveOpen(true); }} className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Approve ({selected.size})</button>
              <button onClick={() => { setRemark(""); setBulkRejectOpen(true); }} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Reject ({selected.size})</button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: DepositRow) => String(r.id)} selectedIds={selected} onToggleSelect={toggleSelect} onToggleAll={toggleAll} />
      </div>

      <Modal isOpen={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Deposit">
        <div className="space-y-4">
          <div><label className={LABEL}>Actual credited amount (optional — leave empty to use requested)</label>
            <input type="number" value={actualAmt} onChange={(e) => setActualAmt(e.target.value)} placeholder="0.00" className={INPUT} /></div>
          <div><label className={LABEL}>Remark (optional)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Optional note" className={INPUT} rows={2} /></div>
          <button onClick={submitApprove} disabled={submitting} className={`${BTN_PRIMARY} w-full`}>{submitting ? "Processing..." : "Approve & Credit"}</button>
        </div>
      </Modal>

      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Deposit">
        <div className="space-y-4">
          <div><label className={LABEL}>Reason (required)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Why is this being rejected?" className={INPUT} rows={2} /></div>
          <button onClick={submitReject} disabled={submitting || !remark.trim()} className={`${BTN_RED} w-full`}>{submitting ? "Processing..." : "Reject Deposit"}</button>
        </div>
      </Modal>

      <Modal isOpen={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} title={`Approve ${selected.size} deposits`}>
        <div className="space-y-4">
          <div><label className={LABEL}>Remark (optional, applies to all)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className={INPUT} rows={2} /></div>
          <button onClick={submitBulkApprove} disabled={submitting} className={`${BTN_PRIMARY} w-full`}>{submitting ? "Processing..." : "Approve All"}</button>
        </div>
      </Modal>

      <Modal isOpen={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} title={`Reject ${selected.size} deposits`}>
        <div className="space-y-4">
          <div><label className={LABEL}>Reason (required)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className={INPUT} rows={2} /></div>
          <button onClick={submitBulkReject} disabled={submitting || !remark.trim()} className={`${BTN_RED} w-full`}>{submitting ? "Processing..." : "Reject All"}</button>
        </div>
      </Modal>
    </div>
  );
}
