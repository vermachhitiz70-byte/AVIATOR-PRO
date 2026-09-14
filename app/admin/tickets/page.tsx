"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL, fmtDate, pill } from "@/components/admin/ui";
import { Search, ChevronDown } from "lucide-react";

type TicketRow = Record<string, unknown>;

const STATUS_OPTIONS = ["", "open", "pending", "closed"];

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [q, setQ] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmClose, setConfirmClose] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/tickets?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
  }, [page, limit, statusFilter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openTicket(t: TicketRow) { setSelectedTicket(t); setReplyText(""); setDetailOpen(true); }

  async function submitReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSubmitting(true);
    const r = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", id: selectedTicket.id, reply: replyText }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setSelectedTicket((prev) => (prev ? { ...prev, admin_reply: replyText, status: "pending" } : prev));
    setReplyText("");
    fetchData();
  }
  async function closeTicket(id: string) {
    setSubmitting(true);
    const r = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", id }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setConfirmClose(null);
    fetchData();
    if (selectedTicket?.id === id) setSelectedTicket((prev) => (prev ? { ...prev, status: "closed" } : prev));
  }
  async function deleteTicket(id: string) {
    setSubmitting(true);
    const r = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setConfirmDelete(null);
    setDetailOpen(false);
    fetchData();
  }

  const columns = [
    { key: "id", label: "Ticket", render: (r: TicketRow) => <span className="font-mono text-xs text-gray-500">#{String(r.id ?? "-").slice(0, 8)}</span> },
    { key: "name", label: "User", render: (r: TicketRow) => (<span><span className="block font-semibold text-gray-900">{String(r.name ?? "-")}</span><span className="block text-xs text-gray-500">{String(r.email ?? "")}</span></span>) },
    { key: "subject", label: "Subject", render: (r: TicketRow) => <span className="font-medium text-gray-800">{String(r.subject ?? "-")}</span> },
    { key: "message", label: "Message", render: (r: TicketRow) => <span className="block max-w-xs truncate text-xs text-gray-500">{String(r.message ?? "-")}</span> },
    { key: "status", label: "Status", render: (r: TicketRow) => pill(r.status) },
    { key: "created_at", label: "Date", render: (r: TicketRow) => <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span> },
    { key: "actions", label: "Actions", render: (r: TicketRow) => (
      <button onClick={() => openTicket(r)} className="rounded-xl border border-[#e9dfc9] px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-[#faf6ec]">View & Reply</button>
    ) },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Support Tickets</h1>
        <p className="mt-1 text-sm text-gray-500">Reply to members and resolve open queries · {total} total</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, subject, message..." className={`${INPUT} pl-9`} />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${INPUT} pr-8`}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Status"}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

      <div className={CARD}>
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: TicketRow) => String(r.id)} />
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`Ticket #${String(selectedTicket?.id ?? "").slice(0, 8)}`}>
        {selectedTicket && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs font-semibold text-gray-500">User</p><p className="font-semibold text-gray-900">{String(selectedTicket.name ?? "-")}</p></div>
              <div><p className="text-xs font-semibold text-gray-500">Subject</p><p className="font-semibold text-gray-900">{String(selectedTicket.subject ?? "-")}</p></div>
              <div><p className="text-xs font-semibold text-gray-500">Status</p><div className="mt-1">{pill(selectedTicket.status)}</div></div>
              <div><p className="text-xs font-semibold text-gray-500">Date</p><p className="text-gray-700">{fmtDate(selectedTicket.created_at)}</p></div>
            </div>
            <div className="rounded-xl bg-[#faf6ec] p-3">
              <p className="mb-1 text-xs font-semibold text-gray-500">Member message</p>
              <p className="text-sm text-gray-800">{String(selectedTicket.message ?? "-")}</p>
            </div>
            {selectedTicket.admin_reply ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="mb-1 text-xs font-semibold text-green-700">Your reply</p>
                <p className="text-sm text-gray-800">{String(selectedTicket.admin_reply)}</p>
              </div>
            ) : null}
            <div><label className={LABEL}>Write a reply</label>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your response..." className={INPUT} rows={3} /></div>
            <div className="flex gap-2">
              <button onClick={submitReply} disabled={submitting || !replyText.trim()} className={`${BTN_PRIMARY} flex-1`}>{submitting ? "Sending..." : "Send Reply"}</button>
              <button onClick={() => setConfirmClose(String(selectedTicket.id))} className="rounded-xl border border-[#e9dfc9] px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Close</button>
              <button onClick={() => setConfirmDelete(String(selectedTicket.id))} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!confirmClose} onClose={() => setConfirmClose(null)} onConfirm={() => confirmClose && closeTicket(confirmClose)} title="Close Ticket" message="Mark this ticket as resolved?" confirmText="Close Ticket" />
      <ConfirmDialog isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={() => confirmDelete && deleteTicket(confirmDelete)} title="Delete Ticket" message="This cannot be undone." confirmText="Delete" destructive />
    </div>
  );
}
