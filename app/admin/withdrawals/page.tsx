"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal } from "@/components/admin";
import { BTN_RED, CARD, INPUT, LABEL, fmtDate, fmtUSD, pill } from "@/components/admin/ui";
import { Search, Check, X, Info } from "lucide-react";

type WithdrawalRow = Record<string, unknown>;

const TABS = ["pending", "approved", "rejected", "all"] as const;
type Tab = typeof TABS[number];

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [payoutTx, setPayoutTx] = useState("");

  const fetchData = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit), status: tab === "all" ? "" : tab });
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/withdrawals?${params}`, { credentials: "include" });
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
    const r = await fetch("/api/admin/withdrawals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    fetchData();
  }

  function openReject(id: string) { setActiveId(id); setRemark(""); setRejectOpen(true); }
  function openApprove(id: string) { setApproveId(id); setPayoutTx(""); setApproveOpen(true); }
  async function submitApprove() {
    if (!approveId) return;
    await postAction({ id: approveId, action: "approve", payout_tx: payoutTx.trim() });
    setApproveOpen(false);
  }
  async function submitReject() {
    if (!activeId) return;
    await postAction({ id: activeId, action: "reject", remark });
    setRejectOpen(false);
  }
  async function submitBulkReject() {
    for (const id of selected) await postAction({ id, action: "reject", remark });
    setBulkRejectOpen(false);
  }

  const columns = [
    { key: "name", label: "User", render: (r: WithdrawalRow) => (<span><span className="block font-semibold text-gray-900">{String(r.name ?? "-")}</span><span className="block text-xs text-gray-500">{String(r.email ?? "")}</span></span>) },
    { key: "debit", label: "Debit", render: (r: WithdrawalRow) => <span className="font-semibold text-gray-900">{fmtUSD(r.debit)}</span> },
    { key: "charge", label: "Charge", render: (r: WithdrawalRow) => <span className="text-red-500">{fmtUSD(r.charge)}</span> },
    { key: "net", label: "Net Payout", render: (r: WithdrawalRow) => <span className="font-bold text-green-700">{fmtUSD(r.net)}</span> },
    { key: "address", label: "Wallet Address", render: (r: WithdrawalRow) => <span className="font-mono text-xs text-gray-500">{String(r.address ?? "-").slice(0, 20) || "-"}</span> },
    { key: "payout_tx", label: "Payout TX", render: (r: WithdrawalRow) => (r.payout_tx ? <span title={String(r.payout_tx)} className="font-mono text-xs text-green-700">{String(r.payout_tx).slice(0, 12)}…</span> : <span className="text-xs text-gray-300">—</span>) },
    { key: "status", label: "Status", render: (r: WithdrawalRow) => pill(r.status) },
    { key: "created_at", label: "Date", render: (r: WithdrawalRow) => <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span> },
    { key: "actions", label: "Actions", render: (r: WithdrawalRow) => {
      if (String(r.status) !== "pending") return <span className="text-xs text-gray-400">—</span>;
      return (
        <div className="flex gap-1.5">
          <button onClick={() => openApprove(String(r.id))} title="Approve & mark paid" className="rounded-lg bg-green-100 p-1.5 text-green-700 hover:bg-green-200"><Check className="h-3.5 w-3.5" /></button>
          <button onClick={() => openReject(String(r.id))} title="Reject & refund" className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200"><X className="h-3.5 w-3.5" /></button>
        </div>
      );
    } },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Withdrawals</h1>
        <p className="mt-1 text-sm text-gray-500">Approve payouts or reject with automatic refund to Principal · {total} total</p>
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
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, wallet address..." className={`${INPUT} pl-9`} />
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className={`${INPUT} w-auto text-xs`} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className={`${INPUT} w-auto text-xs`} />
          {selected.size > 0 && (
            <button onClick={() => { setRemark(""); setBulkRejectOpen(true); }} className="rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">Reject ({selected.size})</button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: WithdrawalRow) => String(r.id)} selectedIds={selected} onToggleSelect={toggleSelect} onToggleAll={toggleAll} />
      </div>

      <Modal isOpen={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject Withdrawal">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-800">The debited amount will be automatically refunded to the user's Principal wallet.</p>
          </div>
          <div><label className={LABEL}>Reason (required)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Why is this being rejected?" className={INPUT} rows={2} /></div>
          <button onClick={submitReject} disabled={submitting || !remark.trim()} className={`${BTN_RED} w-full`}>{submitting ? "Processing..." : "Reject & Refund"}</button>
        </div>
      </Modal>

      <Modal isOpen={bulkRejectOpen} onClose={() => setBulkRejectOpen(false)} title={`Reject ${selected.size} withdrawals`}>
        <div className="space-y-4">
          <div><label className={LABEL}>Reason (required)</label>
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} className={INPUT} rows={2} /></div>
          <button onClick={submitBulkReject} disabled={submitting || !remark.trim()} className={`${BTN_RED} w-full`}>{submitting ? "Processing..." : "Reject All & Refund"}</button>
        </div>
      </Modal>

      <Modal isOpen={approveOpen} onClose={() => setApproveOpen(false)} title="Approve & Mark Paid">
        <div className="space-y-4">
          <div className="rounded-xl bg-green-50 p-3 text-xs text-green-800">Pehle user ke wallet address par payout bhejo, phir uska TX hash neeche dalo — yehi proof rahega.</div>
          <div><label className={LABEL}>Payout TX hash (proof)</label>
            <input value={payoutTx} onChange={(e) => setPayoutTx(e.target.value)} placeholder="e.g. 0x…" className={INPUT} /></div>
          <button onClick={submitApprove} disabled={submitting || !payoutTx.trim()} className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50">{submitting ? "Processing…" : "Approve & Mark Paid"}</button>
        </div>
      </Modal>

    </div>
  );
}
