"use client";
import { useEffect, useState } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { BTN_PRIMARY, CARD, INPUT, LABEL, fmtDate, pill } from "@/components/admin/ui";
import { Megaphone, Plus, Trash2 } from "lucide-react";

type AnnRow = { id: string; title: string; message: string; is_active: number | boolean; created_at: string };

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<AnnRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    const r = await fetch("/api/admin/announcements", { credentials: "include" });
    const j = await r.json();
    if (j.ok) setRows(j.rows || []);
  }
  useEffect(() => { fetchData(); }, []);

  async function post(body: Record<string, unknown>) {
    setSubmitting(true);
    const r = await fetch("/api/admin/announcements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return false; }
    await fetchData();
    return true;
  }
  async function submitCreate() {
    if (!title.trim() || !message.trim()) return;
    if (await post({ action: "create", title: title.trim(), message: message.trim() })) { setCreateOpen(false); setTitle(""); setMessage(""); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="mt-1 text-sm text-gray-500">Broadcast banner to every member dashboard · {rows.filter((r) => r.is_active).length} live</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#e8821e] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#d1710f]"><Plus className="h-4 w-4" />New Announcement</button>
      </div>
      <div className={CARD}>
        <DataTable
          columns={[
            { key: "title", label: "Title", render: (r: AnnRow) => (<span><span className="block font-semibold text-gray-900">{r.title}</span><span className="block max-w-md truncate text-xs text-gray-500">{r.message}</span></span>) },
            { key: "is_active", label: "Status", render: (r: AnnRow) => pill(r.is_active ? "active" : "cancelled") },
            { key: "created_at", label: "Date", render: (r: AnnRow) => <span className="text-xs text-gray-500">{fmtDate(r.created_at)}</span> },
            {
              key: "actions", label: "Actions", render: (r: AnnRow) => (
                <div className="flex gap-1.5">
                  <button onClick={() => post({ action: "toggle", id: String(r.id) })} title={r.is_active ? "Hide" : "Show"} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200">{r.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => setDelId(String(r.id))} title="Delete" className="rounded-lg bg-red-100 p-1.5 text-red-600 hover:bg-red-200"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ),
            },
          ]}
          data={rows}
          page={1}
          limit={Math.max(rows.length, 1)}
          total={rows.length}
          onPageChange={() => {}}
          onLimitChange={() => {}}
          rowKey={(r: AnnRow) => String(r.id)}
        />
        {rows.length === 0 && <p className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400"><Megaphone className="h-4 w-4" />No announcements yet.</p>}
      </div>
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Announcement">
        <div className="space-y-4">
          <div><label className={LABEL}>Title (max 120)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vietnam meeting on Dec 20" className={INPUT} /></div>
          <div><label className={LABEL}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Shown as banner on every member dashboard…" className={INPUT} rows={3} /></div>
          <button onClick={submitCreate} disabled={submitting || !title.trim() || !message.trim()} className={`${BTN_PRIMARY} w-full py-2.5`}>{submitting ? "Publishing…" : "Publish"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={async () => { if (delId) { await post({ action: "delete", id: delId }); setDelId(null); } }} title="Delete Announcement" message="Remove this banner from all dashboards?" confirmText="Delete" destructive />
    </div>
  );
}
