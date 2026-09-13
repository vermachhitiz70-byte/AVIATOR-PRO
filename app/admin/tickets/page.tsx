"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { Search, ChevronDown, X } from "lucide-react";

type TicketRow = Record<string, unknown>;

const STATUS_OPTIONS = ["", "open", "pending", "closed"];

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    const r = await fetch(`/api/admin/tickets?${params}`, { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setRows(j.rows || []);
    setTotal(j.total || 0);
    setLoading(false);
  }, [page, limit, statusFilter, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openTicket(t: TicketRow) {
    setSelectedTicket(t);
    setReplyText("");
    setDetailOpen(true);
  }

  async function submitReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSubmitting(true);
    const r = await fetch("/api/admin/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply", id: selectedTicket.id, reply: replyText }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setSelectedTicket((prev) => prev ? { ...prev, admin_reply: replyText, status: "pending" } : prev);
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
    if (selectedTicket?.id === id) { setSelectedTicket((prev) => prev ? { ...prev, status: "closed" } : prev); }
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

  const statusColors: Record<string, string> = { open: "bg-blue-500/20 text-blue-400", pending: "bg-yellow-500/20 text-yellow-400", closed: "bg-slate-500/20 text-slate-300" };

  const columns = [
    { key: "id", label: "ID", render: (r: TicketRow) => <span className="font-mono text-xs text-slate-300">#{String(r.id ?? "-")?.slice(0, 8)}</span> },
    { key: "name", label: "User", render: (r: TicketRow) => <span className="font-medium text-white">{String(r.name ?? "-")}</span> },
    { key: "subject", label: "Subject", render: (r: TicketRow) => <span className="text-slate-300">{String(r.subject ?? "-")}</span> },
    { key: "message", label: "Preview", render: (r: TicketRow) => <span className="text-xs text-slate-400">{String(r.message ?? "-")?.slice(0, 50)}...</span> },
    { key: "status", label: "Status", render: (r: TicketRow) => <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${statusColors[String(r.status)] || "bg-white/10 text-slate-300"}`}>{String(r.status ?? "-")}</span> },
    { key: "created_at", label: "Date", render: (r: TicketRow) => <span className="text-xs text-slate-400">{new Date(String(r.created_at)).toLocaleDateString()}</span> },
    { key: "actions", label: "Actions", render: (r: TicketRow) => (
      <button onClick={() => openTicket(r)} className="rounded-lg border border-white/10 px-3 py-1 text-xs hover:bg-white/5">View</button>
    ) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">Support Tickets</h2>
        <p className="text-sm text-slate-400">Manage user support tickets</p>
      </div>

      <div className="av-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search user, subject, message..." className="av-input pl-9" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="av-input pr-8">
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : "All Status"}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="av-card">
        <DataTable columns={columns} data={rows} page={page} limit={limit} total={total} onPageChange={setPage} onLimitChange={(l: number) => { setLimit(l); setPage(1); }} rowKey={(r: TicketRow) => String(r.id)} />
      </div>

      {detailOpen && selectedTicket && (
        <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title={`Ticket #${String(selectedTicket.id)?.slice(0, 8)}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-slate-400">User:</span><p className="text-white">{String(selectedTicket.name ?? "-")}</p></div>
              <div><span className="text-xs text-slate-400">Subject:</span><p className="text-white">{String(selectedTicket.subject ?? "-")}</p></div>
              <div><span className="text-xs text-slate-400">Status:</span><p className="text-white">{String(selectedTicket.status ?? "-")}</p></div>
              <div><span className="text-xs text-slate-400">Date:</span><p className="text-white">{new Date(String(selectedTicket.created_at)).toLocaleString()}</p></div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-slate-400 mb-1">User Message:</p>
              <p className="text-sm text-white">{String(selectedTicket.message ?? "-")}</p>
            </div>
            {selectedTicket.admin_reply ? (
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-xs text-yellow-400 mb-1">Admin Reply:</p>
                <p className="text-sm text-white">{String(selectedTicket.admin_reply)}</p>
              </div>
            ) : null}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Reply</label>
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write your reply..." className="av-input" rows={3} />
            </div>
            <div className="flex gap-2">
              <button onClick={submitReply} disabled={submitting || !replyText.trim()} className="av-btn-yellow flex-1 rounded-lg py-2.5 text-sm disabled:opacity-50">{submitting ? "Sending..." : "Send Reply"}</button>
              <button onClick={() => { setConfirmClose(String(selectedTicket.id)); }} className="rounded-lg border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5">Close</button>
              <button onClick={() => { setConfirmDelete(String(selectedTicket.id)); }} className="rounded-lg border border-red-500/20 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmClose}
        onClose={() => setConfirmClose(null)}
        onConfirm={() => confirmClose && closeTicket(confirmClose)}
        title="Close Ticket"
        message="Are you sure you want to close this ticket?"
        confirmText="Close"
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteTicket(confirmDelete)}
        title="Delete Ticket"
        message="Are you sure? This action cannot be undone."
        confirmText="Delete"
        destructive
      />
    </div>
  );
}
