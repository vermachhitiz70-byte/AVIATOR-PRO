"use client";
import { useEffect, useState, useCallback } from "react";
import { DataTable, Modal, ConfirmDialog } from "@/components/admin";
import { Search, Plus, Edit3, Trash2, X, ChevronDown, UserPlus } from "lucide-react";

type Campaign = Record<string, unknown>;
type Achiever = Record<string, unknown>;

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [achievers, setAchievers] = useState<Achiever[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [achieverModalOpen, setAchieverModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formMeetingDate, setFormMeetingDate] = useState("");
  const [formEligibilityEnd, setFormEligibilityEnd] = useState("");
  const [formStatus, setFormStatus] = useState("active");
  const [formCriteria, setFormCriteria] = useState("{}");

  const [achieverFilter, setAchieverFilter] = useState("");
  const [bulkAchieverText, setBulkAchieverText] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    const r = await fetch("/api/admin/campaigns", { credentials: "include" });
    const j = await r.json();
    if (!r.ok || j.error) { setError(j.error || "Failed to load"); setLoading(false); return; }
    setCampaigns(j.campaigns || []);
    setAchievers(j.achievers || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditCampaign(null);
    setFormName(""); setFormLocation(""); setFormMeetingDate(""); setFormEligibilityEnd(""); setFormStatus("active"); setFormCriteria("{}");
    setCreateOpen(true);
  }

  function openEdit(c: Campaign) {
    setEditCampaign(c);
    setFormName(String(c.name || "")); setFormLocation(String(c.location || "")); setFormMeetingDate(String(c.meeting_date || "")); setFormEligibilityEnd(String(c.eligibility_end || ""));
    setFormStatus(String(c.status || "active")); setFormCriteria(typeof c.criteria_json === "string" ? c.criteria_json : JSON.stringify(c.criteria_json || {}));
    setCreateOpen(true);
  }

  async function submitCampaign() {
    setSubmitting(true);
    const body = editCampaign
      ? { action: "update", id: editCampaign.id, name: formName, location: formLocation, meeting_date: formMeetingDate, eligibility_end: formEligibilityEnd, status: formStatus, criteria: formCriteria }
      : { action: "create", name: formName, location: formLocation, meeting_date: formMeetingDate, eligibility_end: formEligibilityEnd, status: formStatus, criteria: formCriteria };
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Action failed"); return; }
    setCreateOpen(false);
    fetchData();
  }

  async function deleteCampaign(id: string) {
    setSubmitting(true);
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setConfirmDelete(null);
    fetchData();
  }

  async function bulkAddAchievers() {
    setSubmitting(true);
    const ids = bulkAchieverText.split(",").map((s) => s.trim()).filter(Boolean);
    const r = await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addAchievers", campaign_id: achieverFilter, user_ids: ids }), credentials: "include" });
    const j = await r.json();
    setSubmitting(false);
    if (!r.ok || j.error) { alert(j.error || "Failed"); return; }
    setAchieverModalOpen(false);
    setBulkAchieverText("");
    fetchData();
  }

  const filteredAchievers = achieverFilter ? achievers.filter((a) => String(a.campaign_id) === achieverFilter) : achievers;

  const statusColors: Record<string, string> = { active: "bg-emerald-500/20 text-emerald-400", inactive: "bg-red-500/20 text-red-400" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Campaigns</h2>
        <p className="text-sm text-slate-400">Manage campaigns and achievers</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <h3 className="font-bold">Campaigns</h3>
        <button onClick={openCreate} className="av-btn-yellow flex items-center gap-2 rounded-lg px-4 py-2 text-sm"><Plus className="h-4 w-4" />New Campaign</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((c) => (
          <div key={String(c.id)} className="av-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-white">{String(c.name)}</h4>
                <p className="text-xs text-slate-400">{String(c.location || "-")}</p>
              </div>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${statusColors[String(c.status)] || "bg-white/10 text-slate-300"}`}>{String(c.status)}</span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-300">
              <p>Meeting: {String(c.meeting_date || "-")?.slice(0, 10)}</p>
              <p>Eligibility End: {String(c.eligibility_end || "-")?.slice(0, 10)}</p>
              <p className="font-mono text-[10px] text-slate-500">Criteria: {JSON.stringify(c.criteria_json || {})?.slice(0, 60)}...</p>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(c)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"><Edit3 className="h-3 w-3" />Edit</button>
              <button onClick={() => setConfirmDelete(String(c.id))} className="flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"><Trash2 className="h-3 w-3" />Delete</button>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && <p className="col-span-full text-sm text-slate-400">No campaigns yet</p>}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold">Achievers</h3>
          <button onClick={() => setAchieverModalOpen(true)} className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"><UserPlus className="h-3.5 w-3.5" />Add Achievers</button>
        </div>

        <div className="av-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={achieverFilter} onChange={(e) => setAchieverFilter(e.target.value)} placeholder="Filter by campaign ID..." className="av-input pl-9" />
            </div>
          </div>
          <DataTable
            columns={[
              { key: "name", label: "Name", render: (r: Achiever) => <span className="font-medium text-white">{String(r.name ?? "-")}</span> },
              { key: "country", label: "Country", render: (r: Achiever) => String(r.country ?? "-") },
              { key: "user_code", label: "User Code", render: (r: Achiever) => <span className="font-mono text-xs text-yellow-400">{String(r.user_code ?? "-")}</span> },
              { key: "earned", label: "Earned", render: (r: Achiever) => <span className="text-emerald-400">${Number(r.earned ?? 0).toLocaleString()}</span> },
              { key: "is_demo", label: "Demo", render: (r: Achiever) => <span className={r.is_demo ? "text-yellow-400" : "text-slate-500"}>{r.is_demo ? "Yes" : "No"}</span> },
              { key: "actions", label: "Actions", render: (r: Achiever) => (
                <button onClick={async () => { await fetch("/api/admin/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteAchiever", id: r.id }), credentials: "include" }); fetchData(); }} className="rounded-lg p-1 text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
              ) },
            ]}
            data={filteredAchievers}
            page={1}
            limit={100}
            total={filteredAchievers.length}
            onPageChange={() => {}}
            onLimitChange={() => {}}
            rowKey={(r: Achiever) => String(r.id)}
          />
        </div>
      </div>

      {createOpen && (
        <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={editCampaign ? "Edit Campaign" : "New Campaign"}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="av-input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Location</label>
              <input value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="av-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Meeting Date</label>
                <input type="date" value={formMeetingDate} onChange={(e) => setFormMeetingDate(e.target.value)} className="av-input" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Eligibility End</label>
                <input type="date" value={formEligibilityEnd} onChange={(e) => setFormEligibilityEnd(e.target.value)} className="av-input" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="av-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Criteria (JSON)</label>
              <textarea value={formCriteria} onChange={(e) => setFormCriteria(e.target.value)} className="av-input font-mono text-xs" rows={3} />
            </div>
            <button onClick={submitCampaign} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Saving..." : editCampaign ? "Update Campaign" : "Create Campaign"}</button>
          </div>
        </Modal>
      )}

      {achieverModalOpen && (
        <Modal isOpen={achieverModalOpen} onClose={() => setAchieverModalOpen(false)} title="Add Achievers">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Campaign ID</label>
              <input value={achieverFilter} onChange={(e) => setAchieverFilter(e.target.value)} placeholder="Campaign ID" className="av-input" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">User IDs (comma separated)</label>
              <textarea value={bulkAchieverText} onChange={(e) => setBulkAchieverText(e.target.value)} placeholder="user_id_1, user_id_2, ..." className="av-input" rows={3} />
            </div>
            <button onClick={bulkAddAchievers} disabled={submitting} className="av-btn-yellow w-full rounded-lg py-2.5 text-sm">{submitting ? "Adding..." : "Add Achievers"}</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteCampaign(confirmDelete)}
        title="Delete Campaign"
        message="Are you sure? This will also delete all associated achievers."
        confirmText="Delete"
        destructive
      />
    </div>
  );
}
